import { PAYMENT } from "@/constants";
import { logger } from "@/utils/logger";
import type { Request } from "express";
import {
  deduplicateWebhook,
  markWebhookProcessed,
} from "../webhook.deduplication";
import { razorpayGateway } from "@/modules/gateways/connectors/razorpay.connector";
import { assertValidWebhookSignature } from "../webhook.helpers";
import {
  findOrderByGatewayOrderId,
  updatePaymentStatusByGatewayOrderId,
} from "../webhook.repository";
import { logPaymentEvent } from "@/modules/payments/payment.repository";
import { PaymentStatus } from "@/types";

export const razorpayWebhookHandler = async (req: Request) => {
  const signature = req.headers["x-razorpay-signature"] as string;

  const isSignatureValid = razorpayGateway.verifyWebhook(req.body, signature);
  assertValidWebhookSignature(isSignatureValid);

  const webhookPayload = JSON.parse(req.body.toString());
  const gatewayOrderId = webhookPayload.payload.payment.entity.order_id;
  const gatewayPaymentId = webhookPayload.payload.payment.entity.id;
  const eventType = webhookPayload.event;

  // INFO: Razorpay sends event ID in headers. If missing, create a surrogate ID like we did for Cashfree
  const eventId =
    (req.headers["x-razorpay-event-id"] as string) ||
    `${webhookPayload.created_at}_${gatewayPaymentId}_${eventType}`;

  const isDuplicate = await deduplicateWebhook(
    PAYMENT.GATEWAYS.RAZORPAY,
    eventId,
    eventType,
    webhookPayload,
  );
  if (isDuplicate) return;

  const currentOrder = await findOrderByGatewayOrderId(gatewayOrderId);
  if (!currentOrder) {
    logger.warn(`No payment found for gatewayOrderId: ${gatewayOrderId}`);
    return;
  }

  const normalizedEventObject = {
    eventId: webhookPayload.payload.payment.entity.id,
    eventType: webhookPayload.event,
    gatewayOrderId,
    gatewayPaymentId,
  };

  const currentStatus = currentOrder.status as PaymentStatus;
  const paymentId = currentOrder.id;

  switch (webhookPayload.event) {
    case "payment.authorized":
      await updatePaymentStatusByGatewayOrderId(
        gatewayOrderId,
        gatewayPaymentId,
        PAYMENT.STATUS.PROCESSING,
      );

      await logPaymentEvent({
        paymentId,
        fromStatus: currentStatus,
        toStatus: PAYMENT.STATUS.PROCESSING,
        trigger: PAYMENT.TRIGGERS.WEBHOOK_RECEIVED,
        payload: normalizedEventObject,
      });

      logger.info("PAYMENT PROCESSING");
      break;
    case "payment.captured":
      // INFO: razorpay can send the same event multiple times so this statement prevent success to success events
      if (currentStatus === PAYMENT.STATUS.SUCCESS) break;

      await updatePaymentStatusByGatewayOrderId(
        gatewayOrderId,
        gatewayPaymentId,
        PAYMENT.STATUS.SUCCESS,
      );

      await logPaymentEvent({
        paymentId,
        fromStatus: currentStatus,
        toStatus: PAYMENT.STATUS.SUCCESS,
        trigger: PAYMENT.TRIGGERS.WEBHOOK_RECEIVED,
        payload: normalizedEventObject,
      });

      logger.info("PAYMENT SUCCESS");
      break;
    case "payment.failed":
      await updatePaymentStatusByGatewayOrderId(
        gatewayOrderId,
        gatewayPaymentId,
        PAYMENT.STATUS.SUCCESS,
      );

      await logPaymentEvent({
        paymentId,
        fromStatus: currentStatus,
        toStatus: PAYMENT.STATUS.FAILED,
        trigger: PAYMENT.TRIGGERS.WEBHOOK_RECEIVED,
        payload: normalizedEventObject,
      });

      logger.info("PAYMENT FAILED");
      break;
  }

  await markWebhookProcessed(eventId);
  return;
};
