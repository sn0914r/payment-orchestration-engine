import { createRazorpayOrder } from "@/providers/razorpay";
import type { Gateway } from "../gateway.types";
import { razorpay } from "@/clients/razorpay";
import { configs } from "@/configs";
import { validateWebhookSignature } from "razorpay/dist/utils/razorpay-utils";
import { PAYMENT } from "@/constants";

export const razorpayGateway: Gateway = {
  initiatePayment: async ({ amount, orderId, currency = "INR" }) => {
    const gatewayOrderId = await createRazorpayOrder(amount, currency, orderId);
    const keyId = configs.RAZORPAY.KEY_ID as string;

    return { gatewayOrderId, keyId };
  },

  verifyWebhook: (payload, signature) => {
    return validateWebhookSignature(
      JSON.stringify(payload),
      signature,
      configs.RAZORPAY.WEBHOOK_SECRET as string,
    );
  },

  getPaymentStatus: async (orderId) => {
    const order = await razorpay.orders.fetch(orderId);
    return { status: order.status };
  },

  classifyError: (err) => {
    const source = err?.error?.source;

    if (source === "customer" || source === "business")
      return PAYMENT.ERROR_TYPES.USER_ERROR;

    return PAYMENT.ERROR_TYPES.GATEWAY_ERROR;
  },
};
