import { PAYMENT } from "@/constants";
import type { GatewayName, SettlementStrategy } from "../reconciliation.types";
import { RazorpaySettlementStrategy } from "./razorpay.strategy";
import { CashfreeSettlementStrategy } from "./cashfree.strategy";

export class SettlementStrategyFactory {
  private static strategies: Map<GatewayName, SettlementStrategy> = new Map([
    [PAYMENT.GATEWAYS.RAZORPAY, new RazorpaySettlementStrategy()],
    [PAYMENT.GATEWAYS.CASHFREE, new CashfreeSettlementStrategy()],
  ]);

  static getStrategy(gateway: GatewayName): SettlementStrategy {
    const strategy = this.strategies.get(gateway);
    if (!strategy) {
      throw new Error(
        `No settlement strategy registered for gateway: ${gateway}`,
      );
    }
    return strategy;
  }
}
