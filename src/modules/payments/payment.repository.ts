import { db } from "@/clients/pgsql";
import { PaymentsEventsTable, PaymentsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PAYMENT } from "@/constants";
import { GatewayAttempts } from "@/db/schema/gatewayAttempts.schema";
import type {
  GatewayAttemptPayload,
  PaymentAuditEvent,
  PaymentMethod,
  PaymentStatus,
} from "./payment.types";

export class PaymentRepository {
  public static async findOrderByOrderId(orderId: string) {
    const [order] = await db
      .select()
      .from(PaymentsTable)
      .where(eq(PaymentsTable.orderId, orderId));

    return order;
  }

  public static async findPaymentById(paymentId: string) {
    const [paymentRecord] = await db
      .select()
      .from(PaymentsTable)
      .where(eq(PaymentsTable.id, paymentId));

    return paymentRecord;
  }

  public static async findByIdempotencyKey(idempotencyKey: string) {
    const [order] = await db
      .select()
      .from(PaymentsTable)
      .where(eq(PaymentsTable.idempotencyKey, idempotencyKey))
      .limit(1);

    return order;
  }

  public static async createPaymentRecord(
    idempotencyKey: string,
    orderId: string,
    method: PaymentMethod,
    amountInRupees: number,
  ) {
    const [paymentRecord] = await db
      .insert(PaymentsTable)
      .values({
        idempotencyKey,
        orderId,
        method,
        amount: amountInRupees * 100,
      })
      .returning();

    return paymentRecord;
  }

  public static async logPaymentEvent(paymentEventData: PaymentAuditEvent) {
    await db.insert(PaymentsEventsTable).values(paymentEventData);
  }

  public static async logGatewayAttempt(
    gatewayAttemptDetails: GatewayAttemptPayload,
  ) {
    await db.insert(GatewayAttempts).values(gatewayAttemptDetails);
  }

  public static async markPaymentRecordFailed(
    paymentId: string,
    gatewayName: string,
  ) {
    await db
      .update(PaymentsTable)
      .set({ gateway: gatewayName, status: PAYMENT.STATUS.FAILED })
      .where(eq(PaymentsTable.id, paymentId));
  }

  public static async updatePaymentRecordGatewayDetails(
    paymentId: string,
    gatewayName: string,
    gatewayOrderId: string,
    paymentStatus: PaymentStatus,
  ) {
    await db
      .update(PaymentsTable)
      .set({
        gateway: gatewayName,
        gatewayOrderId,
        status: paymentStatus,
      })
      .where(eq(PaymentsTable.id, paymentId));
  }
}
