import { cashfree } from "@/clients/cashfree";
import { createCashfreeOrder } from "../providers/cashfree.provider";
import crypto from "crypto";
import { PAYMENT } from "@/constants";
import type { Gateway } from "../gateway.types";

export const cashfreeGateway: Gateway = {
  initiatePayment: async ({ amount, customer: { id, phone, email } }) => {
    const { gatewayOrderId, paymentSession } = await createCashfreeOrder({
      order_id: crypto.randomUUID(),
      order_amount: amount,
      customer_details: {
        customer_id: id,
        customer_phone: phone,
        customer_email: email,
      },
    });

    return {
      gatewayOrderId: gatewayOrderId as string,
      paymentLink: paymentSession as string,
    };
  },

  verifyWebhook: (payload, signature, timestamp) => {
    try {
      const payloadString = Buffer.isBuffer(payload)
        ? payload.toString()
        : typeof payload === "string"
          ? payload
          : JSON.stringify(payload);

      cashfree.PGVerifyWebhookSignature(
        signature,
        payloadString,
        timestamp as string,
      );

      return true;
    } catch (_err) {
      return false;
    }
  },

  getPaymentStatus: async (orderId) => {
    const order = await cashfree.PGFetchOrder(orderId);
    return { status: order.data.order_status as string };
  },

  classifyError: (err) => {
    const message = (err as { message?: string })?.message?.toLowerCase() || "";
    const userMessages = [
      "invalid",
      "cancelled",
      "insufficient",
      "wrong",
      "declined",
    ];

    const isUserError = userMessages.some((msg) => message.includes(msg));

    return isUserError
      ? PAYMENT.ERROR_TYPES.USER_ERROR
      : PAYMENT.ERROR_TYPES.GATEWAY_ERROR;
  },
};
