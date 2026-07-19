import { configs } from "@/configs";
import { ERRORCODES, PAYMENT } from "@/constants";
import { AppError } from "@/errors/AppError";
import { logger } from "@/utils/logger";
import crypto from "crypto";
import type { Request } from "express";
import { PaymentStatus } from "../webhook.types";
import { db } from "@/clients/pgsql";
import { PaymentsEventsTable, PaymentsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logPaymentEvent } from "@/modules/payments/services/initiatePayment";
import {
  deduplicateWebhook,
  markWebhookProcessed,
} from "../webhook.deduplication";

export const razorpayWebhookHandler = async (req: Request) => {
  const signature = req.headers["x-razorpay-signature"] as string;

  validateSignatures(signature, req);

  const parsedBody = JSON.parse(req.body.toString());
  const gatewayOrderId = parsedBody.payload.payment.entity.order_id;
  const gatewayPaymentId = parsedBody.payload.payment.entity.id;
  const eventType = parsedBody.event;
  // INFO: Razorpay sends event ID in headers. If missing, create a surrogate ID like we did for Cashfree
  const eventId = (req.headers["x-razorpay-event-id"] as string) || `${parsedBody.created_at}_${gatewayPaymentId}_${eventType}`;

  const isDuplicate = await deduplicateWebhook(
    PAYMENT.GATEWAYS.RAZORPAY,
    eventId,
    eventType,
    parsedBody,
  );
  if (isDuplicate) return;

  const [currentOrder] = await db
    .select()
    .from(PaymentsTable)
    .where(eq(PaymentsTable.gatewayOrderId, gatewayOrderId));

  if (!currentOrder) {
    logger.warn(`No payment found for gatewayOrderId: ${gatewayOrderId}`);
    return;
  }

  const normalizedJsonEventObject = {
    eventId: parsedBody.payload.payment.entity.id,
    eventType: parsedBody.event,
    gatewayOrderId,
    gatewayPaymentId,
  };

  const currentStatus = currentOrder.status as PaymentStatus;
  const paymentId = currentOrder.id;

  switch (parsedBody.event) {
    case "payment.authorized":
      await processPaymentUpdate(
        PAYMENT.STATUS.PROCESSING,
        gatewayOrderId,
        gatewayPaymentId,
        currentStatus,
        paymentId,
      );

      await logPaymentEvent({
        paymentId,
        fromStatus: currentStatus,
        toStatus: PAYMENT.STATUS.PROCESSING,
        trigger: PAYMENT.TRIGGERS.WEBHOOK_RECEIVED,
        payload: normalizedJsonEventObject,
      });

      logger.info("PAYMENT PROCESSING");
      break;
    case "payment.captured":
      // INFO: razorpay can send the same event multiple times so this statement prevent success to success events
      if (currentStatus === PAYMENT.STATUS.SUCCESS) break;

      await processPaymentUpdate(
        PAYMENT.STATUS.SUCCESS,
        gatewayOrderId,
        gatewayPaymentId,
        currentStatus,
        paymentId,
      );

      await logPaymentEvent({
        paymentId,
        fromStatus: currentStatus,
        toStatus: PAYMENT.STATUS.SUCCESS,
        trigger: PAYMENT.TRIGGERS.WEBHOOK_RECEIVED,
        payload: normalizedJsonEventObject,
      });

      logger.info("PAYMENT SUCCESS");
      break;
    case "payment.failed":
      await processPaymentUpdate(
        PAYMENT.STATUS.FAILED,
        gatewayOrderId,
        gatewayPaymentId,
        currentStatus,
        paymentId,
      );

      await logPaymentEvent({
        paymentId,
        fromStatus: currentStatus,
        toStatus: PAYMENT.STATUS.FAILED,
        trigger: PAYMENT.TRIGGERS.WEBHOOK_RECEIVED,
        payload: normalizedJsonEventObject,
      });

      logger.info("PAYMENT FAILED");
      break;
  }

  await markWebhookProcessed(eventId);
  return;
};

const validateSignatures = (signature: string, req: Request) => {
  const secret = configs.RAZORPAY.WEBHOOK_SECRET as string;
  const generatedSignature = crypto
    .createHmac("sha256", secret)
    .update(req.body)
    .digest("hex");

  if (generatedSignature !== signature) {
    throw new AppError(
      "Invalid webhook signature",
      400,
      ERRORCODES.INVALID_WEBHOOK_SIGNATURE,
    );
  }
};

export const processPaymentUpdate = async (
  status: PaymentStatus,
  gatewayOrderId: string,
  gatewayPaymentId: string,
  fromStatus: PaymentStatus,
  paymentId: string,
) => {
  await db.transaction(async (transaction) => {
    await transaction
      .update(PaymentsTable)
      .set({ status, gatewayPaymentId })
      .where(eq(PaymentsTable.gatewayOrderId, gatewayOrderId));

    // await transaction.insert(PaymentsEventsTable).values({
    //   paymentId,
    //   fromStatus,
    //   toStatus: status,
    //   trigger: PAYMENT.TRIGGERS.WEBHOOK_RECEIVED,
    // });
  });
};
