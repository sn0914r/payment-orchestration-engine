import { db } from "@/clients/pgsql";
import {
  PaymentsTable,
  ReconciliationRunsTable,
  ReconciliationMismatchesTable,
} from "@/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { RECONCILIATION } from "@/constants";
import type { GatewayName, MismatchRecord } from "./reconciliation.types";

export class ReconciliationRepository {
  // --- Runs ---
  static async createRun(data: { runDate: string; gateway: GatewayName }) {
    const [run] = await db
      .insert(ReconciliationRunsTable)
      .values({
        runDate: data.runDate,
        gateway: data.gateway,
        status: RECONCILIATION.STATUS.RUNNING,
      })
      .returning();

    return run;
  }

  static async markRunCompleted(
    runId: string,
    stats: {
      totalTransactions: number;
      matchedCount: number;
      mismatchCount: number;
    },
  ) {
    const [updated] = await db
      .update(ReconciliationRunsTable)
      .set({
        status: RECONCILIATION.STATUS.COMPLETED,
        totalTransactions: stats.totalTransactions,
        matchedCount: stats.matchedCount,
        mismatchCount: stats.mismatchCount,
        completedAt: new Date(),
      })
      .where(eq(ReconciliationRunsTable.id, runId))
      .returning();

    return updated;
  }

  static async markRunFailed(runId: string) {
    await db
      .update(ReconciliationRunsTable)
      .set({
        status: RECONCILIATION.STATUS.FAILED,
        completedAt: new Date(),
      })
      .where(eq(ReconciliationRunsTable.id, runId));
  }

  static async findAllRuns() {
    return await db
      .select()
      .from(ReconciliationRunsTable)
      .orderBy(desc(ReconciliationRunsTable.runDate));
  }

  // --- Payments ---
  static async findPaymentsByDate(targetDate: string, gateway: GatewayName) {
    const startOfDay = new Date(`${targetDate}T00:00:00.000Z`);
    const endOfDay = new Date(`${targetDate}T23:59:59.999Z`);

    return await db
      .select()
      .from(PaymentsTable)
      .where(
        and(
          eq(PaymentsTable.gateway, gateway),
          gte(PaymentsTable.createdAt, startOfDay),
          lte(PaymentsTable.createdAt, endOfDay),
        ),
      );
  }

  // --- Mismatches ---
  static async createMismatches(runId: string, mismatches: MismatchRecord[]) {
    if (mismatches.length === 0) return;

    await db.insert(ReconciliationMismatchesTable).values(
      mismatches.map((m) => ({
        runId,
        paymentId: m.paymentId,
        gateway: m.gateway,
        gatewayPaymentId: m.gatewayPaymentId,
        mismatchType: m.mismatchType,
        ourAmount: m.ourAmount,
        gatewayAmount: m.gatewayAmount,
        ourStatus: m.ourStatus,
        gatewayStatus: m.gatewayStatus,
      })),
    );
  }

  static async findMismatchesByRunId(runId: string) {
    return await db
      .select()
      .from(ReconciliationMismatchesTable)
      .where(eq(ReconciliationMismatchesTable.runId, runId));
  }

  static async markMismatchResolved(mismatchId: string, note?: string) {
    const [updated] = await db
      .update(ReconciliationMismatchesTable)
      .set({
        resolved: true,
        resolutionNote: note,
        resolvedAt: new Date(),
      })
      .where(eq(ReconciliationMismatchesTable.id, mismatchId))
      .returning();

    return updated;
  }
}
