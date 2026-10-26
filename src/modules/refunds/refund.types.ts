import { RefundsTable } from "@/db/schema";
import { PAYMENT } from "@/constants/payment";
import type { PaymentGatewayName } from "@/types";

export type { PaymentGatewayName };

export type RefundRecord = typeof RefundsTable.$inferSelect;

export type RefundStatus =
  (typeof PAYMENT.REFUND_STATUS)[keyof typeof PAYMENT.REFUND_STATUS];

export interface InitiateRefundInput {
  paymentId: string;
  amountInRupees: number;
  idempotencyKey: string;
  reason?: string;
}

export interface RefundResult {
  refundId: string;
  paymentId: string;
  gateway: PaymentGatewayName;
  gatewayRefundId?: string | null;
  amountInRupees: number;
  status: RefundStatus;
  reason?: string | null;
  createdAt?: Date | null;
}
