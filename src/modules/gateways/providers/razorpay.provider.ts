import { razorpay } from "@/clients/razorpay";
import { logger } from "@/utils/logger";

export const createRazorpayOrder = async (
  amountInRupees: number,
  currency: string,
  orderId: string,
): Promise<string> => {
  const RAZORPAY_OPTIONS = {
    amount: amountInRupees * 100,
    currency,
    receipt: `receipt_${orderId.slice(0, 4)}_${Date.now()}`,
  };
  logger.info(RAZORPAY_OPTIONS);
  const razorpayOrder = await razorpay.orders.create(RAZORPAY_OPTIONS);

  return razorpayOrder.id;
};
