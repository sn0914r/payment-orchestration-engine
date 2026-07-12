import { PAYMENT } from "@/constants";
const { RAZORPAY, CASHFREE } = PAYMENT.GATEWAYS;

export const getGatewayByRules = (
  method: string,
  amountInRupees: number,
): string => {
  const amountInPaise = amountInRupees * 100;

  if (amountInPaise >= 10000000) return RAZORPAY;

  if (method === PAYMENT.METHOD.UPI) return CASHFREE;
  if (method === PAYMENT.METHOD.CARD) return RAZORPAY;
  if (method === PAYMENT.METHOD.NETBANKING) return RAZORPAY;
  if (method === PAYMENT.METHOD.WALLET) return CASHFREE;
  if (method === PAYMENT.METHOD.EMI) return RAZORPAY;

  return RAZORPAY;
};
