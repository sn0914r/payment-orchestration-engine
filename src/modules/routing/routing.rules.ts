import { PAYMENT } from "@/constants";
import { PaymentGateway } from "../gateways/gateway.types";
const { RAZORPAY, CASHFREE } = PAYMENT.GATEWAYS;

export const getGatewayByRules = (
  method: string,
  amountInRupees: number,
): PaymentGateway => {
  const amountInPaise = amountInRupees * 100;

  if (amountInPaise >= 10000000) return RAZORPAY;

  if (method === PAYMENT.METHOD.UPI) return CASHFREE;
  if (method === PAYMENT.METHOD.CARD) return RAZORPAY;
  if (method === PAYMENT.METHOD.NETBANKING) return RAZORPAY;
  if (method === PAYMENT.METHOD.WALLET) return RAZORPAY;

  return RAZORPAY;
};
