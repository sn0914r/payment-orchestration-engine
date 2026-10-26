import { db } from "@/clients/pgsql";
import { PaymentsTable, RefundsTable } from "@/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { PAYMENT } from "@/constants";
import type { PaymentGatewayName, RefundRecord } from "./refund.types";

export class RefundRepository {
  static async findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<RefundRecord | undefined> {
    const [record] = await db
      .select()
      .from(RefundsTable)
      .where(eq(RefundsTable.idempotencyKey, idempotencyKey))
      .limit(1);

    return record;
  }

  static async findRefundById(id: string): Promise<RefundRecord | undefined> {
    const [record] = await db
      .select()
      .from(RefundsTable)
      .where(eq(RefundsTable.id, id))
      .limit(1);

    return record;
  }

  static async findRefundsByPaymentId(
    paymentId: string,
  ): Promise<RefundRecord[]> {
    return await db
      .select()
      .from(RefundsTable)
      .where(eq(RefundsTable.paymentId, paymentId))
      .orderBy(desc(RefundsTable.createdAt));
  }

  static async getTotalProcessedRefundAmount(
    paymentId: string,
  ): Promise<number> {
    const [result] = await db
      .select({
        total: sql<number>`coalesce(sum(${RefundsTable.amount}), 0)`,
      })
      .from(RefundsTable)
      .where(
        and(
          eq(RefundsTable.paymentId, paymentId),
          eq(RefundsTable.status, PAYMENT.REFUND_STATUS.PROCESSED),
        ),
      );

    return Number(result?.total || 0);
  }

  static async createRefundRecord(data: {
    paymentId: string;
    gateway: PaymentGatewayName;
    amountInPaise: number;
    idempotencyKey: string;
    reason?: string;
  }): Promise<RefundRecord> {
    const [record] = await db
      .insert(RefundsTable)
      .values({
        paymentId: data.paymentId,
        gateway: data.gateway,
        amount: data.amountInPaise,
        idempotencyKey: data.idempotencyKey,
        reason: data.reason,
        status: PAYMENT.REFUND_STATUS.PENDING,
      })
      .returning();

    return record;
  }

  static async markRefundProcessed(
    id: string,
    gatewayRefundId: string,
  ): Promise<RefundRecord> {
    const [updated] = await db
      .update(RefundsTable)
      .set({
        status: PAYMENT.REFUND_STATUS.PROCESSED,
        gatewayRefundId,
      })
      .where(eq(RefundsTable.id, id))
      .returning();

    return updated;
  }

  static async markRefundFailed(id: string): Promise<void> {
    await db
      .update(RefundsTable)
      .set({
        status: PAYMENT.REFUND_STATUS.FAILED,
      })
      .where(eq(RefundsTable.id, id));
  }

  static async updatePaymentRefundStatus(
    paymentId: string,
    status:
      | typeof PAYMENT.STATUS.PARTIALLY_REFUNDED
      | typeof PAYMENT.STATUS.REFUNDED,
  ): Promise<void> {
    await db
      .update(PaymentsTable)
      .set({ status })
      .where(eq(PaymentsTable.id, paymentId));
  }
}
