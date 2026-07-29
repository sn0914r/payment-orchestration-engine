import { ERRORCODES, PAYMENT } from "@/constants";
import { AppError } from "@/errors/AppError";
import { ProcessPaymentProps } from "./webhook.types";
import { updatePaymentStatusByGatewayOrderId } from "./webhook.repository";
import { logPaymentEvent } from "../payments/payment.repository";
import { notifyClient } from "./notifyClient";

export const assertValidWebhookSignature = (isValid: boolean) => {
  if (isValid) return;

  throw new AppError(
    "Invalid webhook signature",
    400,
    ERRORCODES.INVALID_WEBHOOK_SIGNATURE,
  );
};

export const processPaymentStatusChange = async ({
  newStatus,
  currentStatus,
  currentOrder,
  gatewayOrderId,
  gatewayPaymentId,
  paymentId,
  gatewayName,
  normalizedEventObject,
}: ProcessPaymentProps) => {
  if (currentStatus === newStatus) return;

  await updatePaymentStatusByGatewayOrderId(
    gatewayOrderId,
    gatewayPaymentId,
    newStatus,
  );

  await logPaymentEvent({
    paymentId,
    fromStatus: currentStatus,
    toStatus: newStatus,
    trigger: PAYMENT.TRIGGERS.WEBHOOK_RECEIVED,
    payload: normalizedEventObject,
  });

  if (
    newStatus === PAYMENT.STATUS.SUCCESS ||
    newStatus === PAYMENT.STATUS.FAILED
  ) {
    await notifyClient({
      orderId: currentOrder.orderId,
      status: newStatus,
      gateway: gatewayName,
      amount: currentOrder.amount,
      method: currentOrder.method,
      gatewayPaymentId,
      paymentId,
    });
  }
};
