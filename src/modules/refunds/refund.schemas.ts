import { z } from "zod";

export const InitiateRefundSchema = z.object({
  paymentId: z.string().uuid("Invalid payment ID format"),
  amountInRupees: z.number().positive("Refund amount must be greater than 0"),
  idempotencyKey: z.string().optional(),
  reason: z.string().optional(),
});

export const RefundIdParamSchema = z.object({
  id: z.string().uuid("Invalid refund ID format"),
});

export const PaymentIdParamSchema = z.object({
  paymentId: z.string().uuid("Invalid payment ID format"),
});
