import { razorpay } from "@/clients/razorpay";
import { logger } from "@/utils/logger";
import type {
  SettlementStrategy,
  SettlementTransaction,
} from "../reconciliation.types";

export class RazorpaySettlementStrategy implements SettlementStrategy {
  async fetchSettlements(targetDate: string): Promise<SettlementTransaction[]> {
    const startOfDay = new Date(`${targetDate}T00:00:00.000Z`).getTime() / 1000;
    const endOfDay = new Date(`${targetDate}T23:59:59.999Z`).getTime() / 1000;

    try {
      logger.info({ date: targetDate }, "Fetching Razorpay settlements");

      const response = await razorpay.payments.all({
        from: Math.floor(startOfDay),
        to: Math.floor(endOfDay),
        count: 100,
      });

      const items = response.items || [];

      return items.map((item) => ({
        gatewayPaymentId: item.id,
        gatewayOrderId: item.order_id || undefined,
        amountInPaise:
          typeof item.amount === "number" ? item.amount : Number(item.amount),
        status:
          item.status === "captured"
            ? "success"
            : item.status === "failed"
              ? "failed"
              : item.status,
        settledAt: item.created_at
          ? new Date(item.created_at * 1000)
          : undefined,
      }));
    } catch (error) {
      logger.error(
        { err: error, date: targetDate },
        "Failed to fetch Razorpay settlement records",
      );
      throw error;
    }
  }
}
