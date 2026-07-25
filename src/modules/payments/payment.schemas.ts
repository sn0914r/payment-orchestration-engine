import { PAYMENT } from "@/constants";
import zod from "zod";

export const InitiatePaymentSchema = zod.object({
  amount: zod.number().positive(),
  method: zod.enum(Object.values(PAYMENT.METHOD)),
  orderId: zod.string(),
  customer: zod.object({
    id: zod.string(),
    phone: zod.string(),
    email: zod.email().optional(),
  }),
});

export const PaymentIdSchema = zod.object({ id: zod.string().uuid() });
