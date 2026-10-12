import { RECONCILIATION, PAYMENT } from "@/constants";
import { PaymentsTable } from "@/db/schema";

export type InternalPayment = typeof PaymentsTable.$inferSelect;

export type MismatchType =
  (typeof RECONCILIATION.MISMATCH_TYPE)[keyof typeof RECONCILIATION.MISMATCH_TYPE];

export type ReconciliationRunStatus =
  (typeof RECONCILIATION.STATUS)[keyof typeof RECONCILIATION.STATUS];

export type GatewayName =
  (typeof PAYMENT.GATEWAYS)[keyof typeof PAYMENT.GATEWAYS];

export interface SettlementTransaction {
  gatewayPaymentId: string;
  gatewayOrderId?: string;
  orderId?: string;
  amountInPaise: number;
  status: string;
  settledAt?: Date;
}

export interface SettlementStrategy {
  fetchSettlements(targetDate: string): Promise<SettlementTransaction[]>;
}

export interface TriggerReconciliationInput {
  date: string; // YYYY-MM-DD
  gateway: GatewayName;
}

export interface ReconciliationRunResult {
  runId: string;
  status: ReconciliationRunStatus;
  totalTransactions: number;
  matchedCount: number;
  mismatchCount: number;
}

export interface MismatchRecord {
  paymentId?: string;
  gateway: GatewayName;
  gatewayPaymentId?: string;
  mismatchType: MismatchType;
  ourAmount?: number;
  gatewayAmount?: number;
  ourStatus?: string;
  gatewayStatus?: string;
}

export interface LedgerComparisonResult {
  matchedCount: number;
  mismatches: MismatchRecord[];
  ghostCount: number;
}
