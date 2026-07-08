import { db } from "@/clients/pgsql";
import type { InitiatePaymentReturn } from "../payment.types";
import { PaymentsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ERRORCODES, PAYMENT } from "@/constants";
import { AppError } from "@/errors/AppError";
import { createRazorpayOrder } from "@/providers/razorpay";

export const initiatePayment = async (
  amount: number,
  method: string,
  orderId: string,
  idempotencyKey: string,
  currency: string = "INR",
): Promise<InitiatePaymentReturn> => {
  const [order] = await db
    .select()
    .from(PaymentsTable)
    .where(eq(PaymentsTable.orderId, orderId));

  if (order && order.status === PAYMENT.STATUS.SUCCESS) {
    throw new AppError(
      "Payment has already been completed for this order",
      409,
      ERRORCODES.ORDER_ALREADY_PAID,
    );
  }

  const gatewayOrderId = await createRazorpayOrder(amount, currency, orderId);

  await db.insert(PaymentsTable).values({
    idempotencyKey,
    orderId,
    gateway: PAYMENT.GATEWAYS.RAZORPAY,
    gatewayOrderId,
    status: PAYMENT.STATUS.INITIATED,
    method,
    amount: amount * 100,
    currency,
  });

  return {
    gatewayOrderId,
    gateway: PAYMENT.GATEWAYS.RAZORPAY,
    paymentMethod: method,
  };
};
