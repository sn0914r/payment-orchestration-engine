import { RECONCILIATION, PAYMENT } from "@/constants";
import { logger } from "@/utils/logger";
import { ReconciliationRepository } from "./reconciliation.repository";
import { SettlementStrategyFactory } from "./strategies/settlement-strategy.factory";
import type {
  TriggerReconciliationInput,
  SettlementTransaction,
  MismatchRecord,
  ReconciliationRunResult,
  GatewayName,
  InternalPayment,
  LedgerComparisonResult,
} from "./reconciliation.types";

export class ReconciliationService {
  static async run(
    input: TriggerReconciliationInput,
  ): Promise<ReconciliationRunResult> {
    const { date: targetDate, gateway } = input;
    const run = await ReconciliationRepository.createRun({
      runDate: targetDate,
      gateway,
    });

    logger.info(
      { runId: run.id, date: targetDate, gateway },
      "Started reconciliation run",
    );

    try {
      const dbPayments = await ReconciliationRepository.findPaymentsByDate(
        targetDate,
        gateway,
      );
      const settlements =
        await SettlementStrategyFactory.getStrategy(gateway).fetchSettlements(
          targetDate,
        );
      const settlementMap = this.indexSettlements(settlements);

      const comparison = this.reconcileLedgers(
        dbPayments,
        settlementMap,
        gateway,
      );
      const totalTransactions = dbPayments.length + comparison.ghostCount;

      await this.saveRunResults(run.id, comparison.mismatches, {
        totalTransactions,
        matchedCount: comparison.matchedCount,
        mismatchCount: comparison.mismatches.length,
      });

      logger.info(
        {
          runId: run.id,
          totalTransactions,
          matchedCount: comparison.matchedCount,
          mismatchCount: comparison.mismatches.length,
        },
        "Reconciliation run completed successfully",
      );

      return {
        runId: run.id,
        status: RECONCILIATION.STATUS.COMPLETED,
        totalTransactions,
        matchedCount: comparison.matchedCount,
        mismatchCount: comparison.mismatches.length,
      };
    } catch (error) {
      logger.error({ err: error, runId: run.id }, "Reconciliation run failed");
      await ReconciliationRepository.markRunFailed(run.id);
      throw error;
    }
  }

  static async getRuns() {
    return await ReconciliationRepository.findAllRuns();
  }

  static async getRunMismatches(runId: string) {
    return await ReconciliationRepository.findMismatchesByRunId(runId);
  }

  static async resolveMismatch(mismatchId: string, note?: string) {
    return await ReconciliationRepository.markMismatchResolved(
      mismatchId,
      note,
    );
  }

  // --- Private Helper Methods (Extracted Logic) ---

  private static indexSettlements(
    settlements: SettlementTransaction[],
  ): Map<string, SettlementTransaction> {
    const map = new Map<string, SettlementTransaction>();
    for (const item of settlements) {
      if (item.gatewayPaymentId) {
        map.set(item.gatewayPaymentId, item);
      }
      if (item.gatewayOrderId) {
        map.set(item.gatewayOrderId, item);
      }
    }
    return map;
  }

  private static reconcileLedgers(
    dbPayments: InternalPayment[],
    settlementMap: Map<string, SettlementTransaction>,
    gateway: GatewayName,
  ): LedgerComparisonResult {
    let matchedCount = 0;
    const mismatches: MismatchRecord[] = [];

    // Direction A: Internal DB -> Gateway Settlements
    for (const payment of dbPayments) {
      const matchResult = this.checkPaymentMatch(
        payment,
        settlementMap,
        gateway,
      );

      if (matchResult.isMatched) {
        matchedCount++;
      } else if (matchResult.mismatch) {
        mismatches.push(matchResult.mismatch);
      }
    }

    // Direction B: Remaining Gateway -> Ghost Transactions
    const ghostMismatches = this.findGhostTransactions(settlementMap, gateway);
    mismatches.push(...ghostMismatches);

    return {
      matchedCount,
      mismatches,
      ghostCount: ghostMismatches.length,
    };
  }

  private static checkPaymentMatch(
    payment: InternalPayment,
    settlementMap: Map<string, SettlementTransaction>,
    gateway: GatewayName,
  ): { isMatched: boolean; mismatch?: MismatchRecord } {
    const match =
      (payment.gatewayPaymentId &&
        settlementMap.get(payment.gatewayPaymentId)) ||
      (payment.gatewayOrderId && settlementMap.get(payment.gatewayOrderId));

    if (!match) {
      if (payment.status === PAYMENT.STATUS.SUCCESS) {
        return {
          isMatched: false,
          mismatch: {
            paymentId: payment.id,
            gateway,
            gatewayPaymentId: payment.gatewayPaymentId || undefined,
            mismatchType: RECONCILIATION.MISMATCH_TYPE.MISSING_IN_GATEWAY,
            ourAmount: payment.amount,
            ourStatus: payment.status,
          },
        };
      }
      return { isMatched: false };
    }

    // Remove from map so it won't be counted as a ghost transaction in Direction B
    if (match.gatewayPaymentId) settlementMap.delete(match.gatewayPaymentId);
    if (match.gatewayOrderId) settlementMap.delete(match.gatewayOrderId);

    const amountMatches = payment.amount === match.amountInPaise;
    const statusMatches =
      this.normalizeStatus(payment.status) ===
      this.normalizeStatus(match.status);

    if (!amountMatches) {
      return {
        isMatched: false,
        mismatch: {
          paymentId: payment.id,
          gateway,
          gatewayPaymentId: match.gatewayPaymentId,
          mismatchType: RECONCILIATION.MISMATCH_TYPE.AMOUNT_MISMATCH,
          ourAmount: payment.amount,
          gatewayAmount: match.amountInPaise,
          ourStatus: payment.status,
          gatewayStatus: match.status,
        },
      };
    }

    if (!statusMatches) {
      return {
        isMatched: false,
        mismatch: {
          paymentId: payment.id,
          gateway,
          gatewayPaymentId: match.gatewayPaymentId,
          mismatchType: RECONCILIATION.MISMATCH_TYPE.STATUS_MISMATCH,
          ourAmount: payment.amount,
          gatewayAmount: match.amountInPaise,
          ourStatus: payment.status,
          gatewayStatus: match.status,
        },
      };
    }

    return { isMatched: true };
  }

  private static findGhostTransactions(
    settlementMap: Map<string, SettlementTransaction>,
    gateway: GatewayName,
  ): MismatchRecord[] {
    const processedGhostIds = new Set<string>();
    const ghostMismatches: MismatchRecord[] = [];

    for (const item of settlementMap.values()) {
      if (processedGhostIds.has(item.gatewayPaymentId)) continue;
      processedGhostIds.add(item.gatewayPaymentId);

      ghostMismatches.push({
        gateway,
        gatewayPaymentId: item.gatewayPaymentId,
        mismatchType: RECONCILIATION.MISMATCH_TYPE.MISSING_IN_DB,
        gatewayAmount: item.amountInPaise,
        gatewayStatus: item.status,
      });
    }

    return ghostMismatches;
  }

  private static async saveRunResults(
    runId: string,
    mismatches: MismatchRecord[],
    stats: {
      totalTransactions: number;
      matchedCount: number;
      mismatchCount: number;
    },
  ): Promise<void> {
    await ReconciliationRepository.createMismatches(runId, mismatches);
    await ReconciliationRepository.markRunCompleted(runId, stats);
  }

  private static normalizeStatus(status?: string | null): string {
    if (!status) return "";
    const s = status.toLowerCase();
    if (s === "captured" || s === "success" || s === "paid") return "success";
    if (s === "failed" || s === "declined" || s === "cancelled")
      return "failed";
    if (s === "initiated" || s === "pending" || s === "processing")
      return "processing";
    return s;
  }
}
