import { ERRORCODES, PAYMENT } from "@/constants";
import { PaymentsTable } from "@/db/schema";
import { AppError } from "@/errors/AppError";

export const assertOrderNotAlreadyPaid = (
  order: typeof PaymentsTable.$inferSelect | undefined,
) => {
  if (order && order.status === PAYMENT.STATUS.SUCCESS) {
    throw new AppError(
      "Payment has already been completed for this order",
      409,
      ERRORCODES.ORDER_ALREADY_PAID,
    );
  }
};

export const assertPaymentRecordCreated = (
  paymentRecord: typeof PaymentsTable.$inferSelect | undefined,
) => {
  if (!paymentRecord) {
    throw new AppError(
      "Failed to initiate payment",
      500,
      ERRORCODES.PAYMENT_INITIATION_FAILED,
    );
  }
};

export const transformPaymentRecord = (
  paymentRecord: typeof PaymentsTable.$inferSelect,
) => {
  const {
    id: paymentId,
    orderId,
    status,
    gateway,
    gatewayOrderId,
    gatewayPaymentId,
    amount: amountInPaise,
    method: paymentMethod,
    createdAt,
    updatedAt,
  } = paymentRecord;

  return {
    paymentId,
    orderId,
    status,
    gateway,
    gatewayOrderId,
    gatewayPaymentId,
    amount: amountInPaise / 100,
    paymentMethod,
    createdAt,
    updatedAt,
  };
};