import { db } from "@/clients/pgsql";
import { ERRORCODES, PAYMENT } from "@/constants";
import { PaymentsTable } from "@/db/schema";
import { AppError } from "@/errors/AppError";
import { cashfreeGateway } from "@/modules/gateways/connectors/cashfree";
import { logger } from "@/utils/logger";
import { eq } from "drizzle-orm";
import type { Request } from "express";
import type { PaymentStatus } from "../webhook.types";
import { processPaymentUpdate } from "./razorpayWebhookHandler";
import { logPaymentEvent } from "@/modules/payments/services/initiatePayment";

export const cashfreeWebhookHandler = async (req: Request) => {
  logger.info("CASHFREE WEBHOOK START");
  const signature = req.headers["x-webhook-signature"] as string;
  const timestamp = req.headers["x-webhook-timestamp"] as string;

  const isValid = cashfreeGateway.verifyWebhook(req.body, signature, timestamp);
  if (!isValid) {
    throw new AppError(
      "Invalid webhook signature",
      400,
      ERRORCODES.INVALID_WEBHOOK_SIGNATURE,
    );
  }

  const parsedBody = JSON.parse(req.body.toString());
  const gatewayOrderId = parsedBody.data.order.order_id;
  const gatewayPaymentId = parsedBody.data.payment.cf_payment_id;

  const [currentOrder] = await db
    .select()
    .from(PaymentsTable)
    .where(eq(PaymentsTable.gatewayOrderId, gatewayOrderId));

  if (!currentOrder) {
    logger.warn(`No payment found for gatewayOrderId: ${gatewayOrderId}`);
    return;
  }

  const normalizedJsonEventObject = {
    eventId: parsedBody.data.payment.cf_payment_id,
    eventType: parsedBody.type,
    gatewayOrderId,
    gatewayPaymentId,
  };

  const currentStatus = currentOrder.status as PaymentStatus;
  const paymentId = currentOrder.id;

  switch (parsedBody.type) {
    case "PAYMENT_SUCCESS_WEBHOOK":
      logger.info(
        `PAYMENT_SUCCESS_EVENT HIT FROM CASHFREE WEBHOOK, PAYMENT ID IS: ${paymentId}`,
      );
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
      logger.info("PAYMENT SUCCESS - CASHFREE");
      break;

    case "PAYMENT_FAILED_WEBHOOK":
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
      logger.info("PAYMENT FAILED - CASHFREE");
      break;
  }

  logger.info("CASHFREE WEBHOOK END");
  return;
};
