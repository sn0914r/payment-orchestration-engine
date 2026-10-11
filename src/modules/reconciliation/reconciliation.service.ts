import { db } from "@/clients/pgsql";
import {
  PaymentsTable,
  ReconciliationRunsTable,
  ReconciliationMismatchesTable,
} from "@/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { RECONCILIATION, PAYMENT } from "@/constants";
import { logger } from "@/utils/logger";
import { fetchRazorpaySettlements } from "./matchers/razorpay.matcher";
import { fetchCashfreeSettlements } from "./matchers/cashfree.matcher";
import type {
  TriggerReconciliationInput,
  SettlementTransaction,
  MismatchRecord,
} from "./reconciliation.types";

const normalizeStatus = (status?: string | null): string => {
  if (!status) return "";
  const s = status.toLowerCase();
  if (s === "captured" || s === "success" || s === "paid") return "success";
  if (s === "failed" || s === "declined" || s === "cancelled") return "failed";
  if (s === "initiated" || s === "pending" || s === "processing") return "processing";
  return s;
};

export const runReconciliationService = async (
  input: TriggerReconciliationInput,
) => {
  const { date: targetDate, gateway } = input;

  // 1. Initialize run record
  const [run] = await db
    .insert(ReconciliationRunsTable)
    .values({
      runDate: targetDate,
      gateway,
      status: RECONCILIATION.STATUS.RUNNING,
    })
    .returning();

  logger.info({ runId: run.id, date: targetDate, gateway }, "Started reconciliation run");

  try {
    // 2. Fetch internal payments for the target date and gateway
    const startOfDay = new Date(`${targetDate}T00:00:00.000Z`);
    const endOfDay = new Date(`${targetDate}T23:59:59.999Z`);

    const dbPayments = await db
      .select()
      .from(PaymentsTable)
      .where(
        and(
          eq(PaymentsTable.gateway, gateway),
          gte(PaymentsTable.createdAt, startOfDay),
          lte(PaymentsTable.createdAt, endOfDay),
        ),
      );

    // 3. Fetch settlement records from gateway
    let gatewaySettlements: SettlementTransaction[] = [];
    if (gateway === PAYMENT.GATEWAYS.RAZORPAY) {
      gatewaySettlements = await fetchRazorpaySettlements(targetDate);
    } else if (gateway === PAYMENT.GATEWAYS.CASHFREE) {
      gatewaySettlements = await fetchCashfreeSettlements(targetDate);
    }

    // 4. Index gateway settlements in memory
    const gatewayMap = new Map<string, SettlementTransaction>();
    gatewaySettlements.forEach((item) => {
      if (item.gatewayPaymentId) {
        gatewayMap.set(item.gatewayPaymentId, item);
      }
      if (item.gatewayOrderId) {
        gatewayMap.set(item.gatewayOrderId, item);
      }
    });

    let matchedCount = 0;
    const mismatches: MismatchRecord[] = [];

    // 5. Direction A: Internal DB -> Gateway Check
    for (const payment of dbPayments) {
      const match =
        (payment.gatewayPaymentId && gatewayMap.get(payment.gatewayPaymentId)) ||
        (payment.gatewayOrderId && gatewayMap.get(payment.gatewayOrderId));

      if (!match) {
        // If DB has a SUCCESS payment but gateway never recorded settlement
        if (payment.status === PAYMENT.STATUS.SUCCESS) {
          mismatches.push({
            paymentId: payment.id,
            gateway,
            gatewayPaymentId: payment.gatewayPaymentId || undefined,
            mismatchType: RECONCILIATION.MISMATCH_TYPE.MISSING_IN_GATEWAY,
            ourAmount: payment.amount,
            ourStatus: payment.status,
          });
        }
        continue;
      }

      // Found in gateway report -> Remove to prevent duplicate counting in Direction B
      if (match.gatewayPaymentId) gatewayMap.delete(match.gatewayPaymentId);
      if (match.gatewayOrderId) gatewayMap.delete(match.gatewayOrderId);

      const amountMatches = payment.amount === match.amountInPaise;
      const statusMatches = normalizeStatus(payment.status) === normalizeStatus(match.status);

      if (!amountMatches) {
        mismatches.push({
          paymentId: payment.id,
          gateway,
          gatewayPaymentId: match.gatewayPaymentId,
          mismatchType: RECONCILIATION.MISMATCH_TYPE.AMOUNT_MISMATCH,
          ourAmount: payment.amount,
          gatewayAmount: match.amountInPaise,
          ourStatus: payment.status,
          gatewayStatus: match.status,
        });
      } else if (!statusMatches) {
        mismatches.push({
          paymentId: payment.id,
          gateway,
          gatewayPaymentId: match.gatewayPaymentId,
          mismatchType: RECONCILIATION.MISMATCH_TYPE.STATUS_MISMATCH,
          ourAmount: payment.amount,
          gatewayAmount: match.amountInPaise,
          ourStatus: payment.status,
          gatewayStatus: match.status,
        });
      } else {
        matchedCount++;
      }
    }

    // 6. Direction B: Gateway -> Internal DB (Ghost transactions)
    // Any remaining unique settlement items exist on the gateway but not in our DB
    const processedGhostIds = new Set<string>();
    for (const item of gatewayMap.values()) {
      if (processedGhostIds.has(item.gatewayPaymentId)) continue;
      processedGhostIds.add(item.gatewayPaymentId);

      mismatches.push({
        gateway,
        gatewayPaymentId: item.gatewayPaymentId,
        mismatchType: RECONCILIATION.MISMATCH_TYPE.MISSING_IN_DB,
        gatewayAmount: item.amountInPaise,
        gatewayStatus: item.status,
      });
    }

    // 7. Persist individual mismatches
    if (mismatches.length > 0) {
      await db.insert(ReconciliationMismatchesTable).values(
        mismatches.map((m) => ({
          runId: run.id,
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

    // 8. Update run record with final statistics
    const totalTransactions = dbPayments.length + processedGhostIds.size;
    await db
      .update(ReconciliationRunsTable)
      .set({
        status: RECONCILIATION.STATUS.COMPLETED,
        totalTransactions,
        matchedCount,
        mismatchCount: mismatches.length,
        completedAt: new Date(),
      })
      .where(eq(ReconciliationRunsTable.id, run.id));

    logger.info(
      {
        runId: run.id,
        totalTransactions,
        matchedCount,
        mismatchCount: mismatches.length,
      },
      "Reconciliation run completed successfully",
    );

    return {
      runId: run.id,
      status: RECONCILIATION.STATUS.COMPLETED,
      totalTransactions,
      matchedCount,
      mismatchCount: mismatches.length,
    };
  } catch (error) {
    logger.error({ err: error, runId: run.id }, "Reconciliation run failed");
    await db
      .update(ReconciliationRunsTable)
      .set({
        status: RECONCILIATION.STATUS.FAILED,
        completedAt: new Date(),
      })
      .where(eq(ReconciliationRunsTable.id, run.id));

    throw error;
  }
};

export const getReconciliationRunsService = async () => {
  return await db
    .select()
    .from(ReconciliationRunsTable)
    .orderBy(desc(ReconciliationRunsTable.runDate));
};

export const getRunMismatchesService = async (runId: string) => {
  return await db
    .select()
    .from(ReconciliationMismatchesTable)
    .where(eq(ReconciliationMismatchesTable.runId, runId));
};

export const resolveMismatchService = async (
  mismatchId: string,
  note?: string,
) => {
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
};
