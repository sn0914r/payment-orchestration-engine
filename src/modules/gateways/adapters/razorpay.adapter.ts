import { configs } from "@/configs";
import { razorpay } from "@/clients/razorpay";
import { validateWebhookSignature } from "razorpay/dist/utils/razorpay-utils";
import { PAYMENT } from "@/constants";
import { toPayloadString } from "../gateway.helpers";
import type {
  Gateway,
  GatewayResponse,
  GatewayStatusResponse,
  InitiatePaymentData,
} from "../gateway.types";

type RazorpayError = {
  error?: {
    source?: string;
  };
};

export class RazorpayGateway implements Gateway {
  async initiatePayment(data: InitiatePaymentData): Promise<GatewayResponse> {
    const razorpayOrder = await razorpay.orders.create({
      amount: data.amount * 100, // INFO: Razorpay expects amount in paise so we multiplied by 100 here
      currency: data.currency || "INR",
      receipt: `receipt_${data.orderId.slice(0, 4)}_${Date.now()}`,
    });

    return { gatewayOrderId: razorpayOrder.id, keyId: configs.RAZORPAY.KEY_ID };
  }

  verifyWebhook(payload: unknown, signature: string): boolean {
    const payloadString = toPayloadString(payload);

    return validateWebhookSignature(
      payloadString,
      signature,
      configs.RAZORPAY.WEBHOOK_SECRET as string,
    );
  }

  async getPaymentStatus(orderId: string): Promise<GatewayStatusResponse> {
    const order = await razorpay.orders.fetch(orderId);

    return { status: order.status };
  }

  classifyError(err: unknown): string {
    const razorpayError = err as RazorpayError;
    const source = razorpayError?.error?.source;

    if (source === "customer" || source === "business") {
      return PAYMENT.ERROR_TYPES.USER_ERROR;
    }

    return PAYMENT.ERROR_TYPES.GATEWAY_ERROR;
  }
}
