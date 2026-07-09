import type { PaymentRecord } from "./payment.types";

export const formatPaymentRecord = (record: PaymentRecord) => {
  return {
    paymentId: record.id,
    orderId: record.orderId,
    status: record.status,
    gateway: record.gateway,
    gatewayOrderId: record.gatewayOrderId,
    gatewayPaymentId: record.gatewayPaymentId,
    amount: record.amount / 100,
    method: record.method,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
};
