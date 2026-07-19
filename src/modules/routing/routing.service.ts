import { PAYMENT } from "@/constants";
import { getGatewayByRules } from "./routing.rules";
import { PaymentGateway } from "../gateways/gateway.types";

const { RAZORPAY, CASHFREE } = PAYMENT.GATEWAYS;

export const getRoutingGateway = (
  method: string,
  amountInRupees: number,
): PaymentGateway => {
  return getGatewayByRules(method, amountInRupees);
};

export const getFallbackGateway = (
  failedGateway: string,
): PaymentGateway | null => {
  if (failedGateway === CASHFREE) return RAZORPAY;
  if (failedGateway === RAZORPAY) return CASHFREE;

  return null;
};
