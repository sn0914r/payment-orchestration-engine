import { db } from "@/clients/pgsql";
import { PaymentsEventsTable, PaymentsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { GatewayAttempts } from "@/db/schema/gatewayAttempts.schema";
import { PAYMENT } from "@/constants";
import { GatewayAttemptType, PaymentEventType } from "./payment.types";
import { PaymentMethod, PaymentStatus } from "@/types";

export const findOrderByOrderId = async (orderId: string) => {
  const [order] = await db
    .select()
    .from(PaymentsTable)
    .where(eq(PaymentsTable.orderId, orderId));

  return order;
};

export const insertPaymentRecord = async (
  idempotencyKey: string,
  orderId: string,
  method: PaymentMethod,
  amountInRupees: number,
) => {
  const [paymentRecord] = await db
    .insert(PaymentsTable)
    .values({ idempotencyKey, orderId, method, amount: amountInRupees * 100 })
    .returning();

  return paymentRecord;
};

export const logPaymentEvent = async (paymentEventData: PaymentEventType) => {
  await db.insert(PaymentsEventsTable).values(paymentEventData);
};

export const logGatewayAttempt = async (
  gatewayAttemptDetails: GatewayAttemptType,
) => {
  await db.insert(GatewayAttempts).values(gatewayAttemptDetails);
};

export const markPaymentRecordFailed = async (
  paymentId: string,
  gatewayName: string,
) => {
  await db
    .update(PaymentsTable)
    .set({ gateway: gatewayName, status: PAYMENT.STATUS.FAILED })
    .where(eq(PaymentsTable.id, paymentId));
};

export const updatePaymentRecordGatewayDetails = async (
  paymentId: string,
  gatewayName: string,
  gatewayOrderId: string,
  paymentStatus: PaymentStatus,
) => {
  await db
    .update(PaymentsTable)
    .set({
      gateway: gatewayName,
      gatewayOrderId,
      status: paymentStatus,
    })
    .where(eq(PaymentsTable.id, paymentId));
};

export const findPaymentByPaymentId = async (paymentId: string) => {
  const [paymentRecord] = await db
    .select()
    .from(PaymentsTable)
    .where(eq(PaymentsTable.id, paymentId));

  return paymentRecord;
};
