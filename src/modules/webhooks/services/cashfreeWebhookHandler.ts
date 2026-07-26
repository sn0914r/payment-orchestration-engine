import { PAYMENT } from "@/constants";
import { cashfreeGateway } from "@/modules/gateways/connectors/cashfree.connector";
import {
  deduplicateWebhook,
  markWebhookProcessed,
} from "../webhook.deduplication";
import { logPaymentEvent } from "@/modules/payments/payment.repository";
import { assertValidWebhookSignature } from "../webhook.helpers";
import {
  findOrderByGatewayOrderId,
  updatePaymentStatusByGatewayOrderId,
} from "../webhook.repository";
import type { Request } from "express";
import { logger } from "@/utils/logger";
import { PaymentStatus } from "@/types";
import { notifyClient } from "../notifyClient";

export const cashfreeWebhookHandler = async (req: Request) => {
  const signature = req.headers["x-webhook-signature"] as string;
  const timestamp = req.headers["x-webhook-timestamp"] as string;

  const isSignatureValid = cashfreeGateway.verifyWebhook(
    req.body,
    signature,
    timestamp,
  );
  assertValidWebhookSignature(isSignatureValid);

  const webhookPayload = JSON.parse(req.body.toString());
  const gatewayOrderId = webhookPayload.data.order.order_id;
  const gatewayPaymentId = webhookPayload.data.payment.cf_payment_id;
  const eventType = webhookPayload.type;

  // INFO: Cashfree does not provide a native event_id in their webhook payloads so provided own key
  const eventId = `${timestamp}_${gatewayPaymentId}_${eventType}`;

  const isDuplicate = await deduplicateWebhook(
    PAYMENT.GATEWAYS.CASHFREE,
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
    eventId,
    eventType,
    gatewayOrderId,
    gatewayPaymentId,
  };

  const currentStatus = currentOrder.status as PaymentStatus;
  const paymentId = currentOrder.id;

  switch (webhookPayload.type) {
    case "PAYMENT_SUCCESS_WEBHOOK":
      logger.info(
        `PAYMENT_SUCCESS_EVENT HIT FROM CASHFREE WEBHOOK, PAYMENT ID IS: ${paymentId}`,
      );
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

      await notifyClient({
        orderId: currentOrder.orderId,
        status: PAYMENT.STATUS.SUCCESS,
        gateway: PAYMENT.GATEWAYS.CASHFREE,
        amount: currentOrder.amount,
        method: currentOrder.method,
        gatewayPaymentId,
        paymentId,
      });

      logger.info("PAYMENT SUCCESS - CASHFREE");
      break;

    case "PAYMENT_FAILED_WEBHOOK":
      await updatePaymentStatusByGatewayOrderId(
        gatewayOrderId,
        gatewayPaymentId,
        PAYMENT.STATUS.FAILED,
      );

      await logPaymentEvent({
        paymentId,
        fromStatus: currentStatus,
        toStatus: PAYMENT.STATUS.FAILED,
        trigger: PAYMENT.TRIGGERS.WEBHOOK_RECEIVED,
        payload: normalizedEventObject,
      });

      await notifyClient({
        orderId: currentOrder.orderId,
        status: PAYMENT.STATUS.FAILED,
        gateway: PAYMENT.GATEWAYS.CASHFREE,
        amount: currentOrder.amount,
        method: currentOrder.method,
        gatewayPaymentId,
        paymentId,
      });
      logger.info("PAYMENT FAILED - CASHFREE");
      break;
  }

  await markWebhookProcessed(eventId);
  return;
};
