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

export const razorpayWebhookHandler = async (req: Request) => {
  const signature = req.headers["x-razorpay-signature"] as string;

  validateSignatures(signature, req);

  const parsedBody = JSON.parse(req.body.toString());
  const gatewayOrderId = parsedBody.payload.payment.entity.order_id;
  const gatewayPaymentId = parsedBody.payload.payment.entity.id;

  const [currentOrder] = await db
    .select()
    .from(PaymentsTable)
    .where(eq(PaymentsTable.gatewayOrderId, gatewayOrderId));

  // FIX: Add current order not found edge case

  const currentStatus = currentOrder.status as PaymentStatus;
  const paymentId = currentOrder.id;

  switch (parsedBody.event) {
    case "payment.authorized":
      await updatePaymentRecord(
        PAYMENT.STATUS.PROCESSING,
        gatewayOrderId,
        gatewayPaymentId,
      );
      await savePaymentEvent(
        currentStatus,
        PAYMENT.STATUS.PROCESSING,
        paymentId,
      );
      logger.info("PAYMENT PROCESSING");
      break;
    case "payment.captured":
      await updatePaymentRecord(
        PAYMENT.STATUS.SUCCESS,
        gatewayOrderId,
        gatewayPaymentId,
      );
      await savePaymentEvent(currentStatus, PAYMENT.STATUS.SUCCESS, paymentId);
      logger.info("PAYMENT SUCCESS");
      break;
    case "payment.failed":
      await updatePaymentRecord(
        PAYMENT.STATUS.FAILED,
        gatewayOrderId,
        gatewayPaymentId,
      );
      await savePaymentEvent(currentStatus, PAYMENT.STATUS.FAILED, paymentId);
      logger.info("PAYMENT FAILED");
      break;
  }
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

const updatePaymentRecord = async (
  status: PaymentStatus,
  gatewayOrderId: string,
  gatewayPaymentId: string,
) => {
  const result = await db
    .update(PaymentsTable)
    .set({ status, gatewayPaymentId })
    .where(eq(PaymentsTable.gatewayOrderId, gatewayOrderId))
    .returning({ id: PaymentsTable.id });

  if (result.length === 0) {
    logger.warn(`No payment found for orderId: ${gatewayOrderId}`);
  }
};

const savePaymentEvent = async (
  fromStatus: PaymentStatus,
  toStatus: PaymentStatus,
  gatewayPaymentId: string,
) => {
  await db.insert(PaymentsEventsTable).values({
    paymentId: gatewayPaymentId,
    fromStatus,
    toStatus,
    trigger: PAYMENT.TRIGGERS.WEBHOOK_RECEIVED,
  });
};
