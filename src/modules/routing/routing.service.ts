import { PAYMENT } from "@/constants";
import { getGatewayByRules } from "./routing.rules";

const { RAZORPAY, CASHFREE } = PAYMENT.GATEWAYS;

export const getRoutingGateway = (
  method: string,
  amountInRupees: number,
): string => {
  return getGatewayByRules(method, amountInRupees);
};

export const getFallbackGateway = (failedGateway: string): string | null => {
  if (failedGateway === CASHFREE) return RAZORPAY;
  if (failedGateway === RAZORPAY) return CASHFREE;

  return null;
};
