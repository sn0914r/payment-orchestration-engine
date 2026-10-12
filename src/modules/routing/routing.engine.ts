import { PAYMENT } from "@/constants";
import type { PaymentGatewayName } from "@/types";

export class RoutingEngine {
  public static getRoutingGateway(
    method: string,
    amountInRupees: number,
  ): PaymentGatewayName {
    const amountInPaise = amountInRupees * 100;

    if (amountInPaise >= 10_000_000) {
      return PAYMENT.GATEWAYS.RAZORPAY;
    }

    if (method === PAYMENT.METHOD.UPI) {
      return PAYMENT.GATEWAYS.CASHFREE;
    }

    return PAYMENT.GATEWAYS.RAZORPAY;
  }

  public static getFallbackGateway(
    failedGateway: string,
  ): PaymentGatewayName | null {
    const fallbackMap: Record<string, PaymentGatewayName> = {
      [PAYMENT.GATEWAYS.CASHFREE]: PAYMENT.GATEWAYS.RAZORPAY,
      [PAYMENT.GATEWAYS.RAZORPAY]: PAYMENT.GATEWAYS.CASHFREE,
    };

    return fallbackMap[failedGateway] || null;
  }
}
