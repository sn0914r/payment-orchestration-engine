import { cashfree } from "@/clients/cashfree";
import { logger } from "@/utils/logger";
import type {
  SettlementStrategy,
  SettlementTransaction,
} from "../reconciliation.types";

export class CashfreeSettlementStrategy implements SettlementStrategy {
  async fetchSettlements(targetDate: string): Promise<SettlementTransaction[]> {
    try {
      logger.info({ date: targetDate }, "Fetching Cashfree settlement records");

      const startDate = `${targetDate}T00:00:00Z`;
      const endDate = `${targetDate}T23:59:59Z`;

      const response = await cashfree.PGFetchSettlements({
        pagination: { limit: 100 },
        filters: {
          start_date: startDate,
          end_date: endDate,
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = (response.data as any)?.data || [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return items.map((item: any) => ({
        gatewayPaymentId: item.cf_payment_id
          ? String(item.cf_payment_id)
          : String(item.cf_settlement_id),
        gatewayOrderId: item.order_id || undefined,
        orderId: item.order_id || undefined,
        amountInPaise: Math.round(
          (Number(item.order_amount) || Number(item.settlement_amount) || 0) *
            100,
        ),
        status:
          item.payment_status === "SUCCESS" ||
          item.settlement_status === "SETTLED"
            ? "success"
            : "failed",
        settledAt: item.settlement_date
          ? new Date(item.settlement_date)
          : undefined,
      }));
    } catch (error) {
      logger.warn(
        { err: error, date: targetDate },
        "Cashfree settlement query returned empty or error, falling back to empty list",
      );
      return [];
    }
  }
}
