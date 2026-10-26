import { cashfree } from "@/clients/cashfree";
import crypto from "crypto";
import { PAYMENT } from "@/constants";
import type {
  Gateway,
  GatewayRefundResponse,
  GatewayResponse,
  GatewayStatusResponse,
  InitiatePaymentData,
  RefundPaymentData,
} from "../gateway.types";
import { mapCashfreePaymentMethod, toPayloadString } from "../gateway.helpers";

export class CashfreeGateway implements Gateway {
  async initiatePayment(data: InitiatePaymentData): Promise<GatewayResponse> {
    const paymentMethods = mapCashfreePaymentMethod(data.method);

    const gatewayResponse = await cashfree.PGCreateOrder({
      order_id: crypto.randomUUID(),
      order_amount: data.amount,
      order_currency: data.currency || "INR",
      order_meta: paymentMethods
        ? { payment_methods: paymentMethods }
        : undefined,
      customer_details: {
        customer_id: data.customer.id,
        customer_phone: data.customer.phone,
        customer_email: data.customer.email,
      },
    });

    return {
      gatewayOrderId: gatewayResponse.data.order_id as string,
      paymentLink: gatewayResponse.data.payment_session_id,
    };
  }

  async refundPayment(data: RefundPaymentData): Promise<GatewayRefundResponse> {
    const orderId = (data.gatewayOrderId || data.gatewayPaymentId) as string;
    const response = await cashfree.PGOrderCreateRefund(orderId, {
      refund_amount: data.amountInPaise / 100,
      refund_id: crypto.randomUUID(),
      refund_note: data.reason || "Refund requested",
    });

    return {
      gatewayRefundId: String(
        response.data.cf_refund_id || response.data.refund_id,
      ),
      status: (response.data.refund_status as string) || "SUCCESS",
      amountInPaise: Math.round(Number(response.data.refund_amount) * 100),
    };
  }

  verifyWebhook(
    payload: unknown,
    signature: string,
    timestamp?: string,
  ): boolean {
    try {
      cashfree.PGVerifyWebhookSignature(
        signature,
        toPayloadString(payload),
        timestamp as string,
      );

      return true;
    } catch (_error) {
      return false;
    }
  }

  async getPaymentStatus(orderId: string): Promise<GatewayStatusResponse> {
    const order = await cashfree.PGFetchOrder(orderId);
    return { status: order.data.order_status as string };
  }

  classifyError(err: unknown): string {
    const errorMessage = err instanceof Error ? err.message.toLowerCase() : "";
    const userMessages = [
      "invalid",
      "cancelled",
      "insufficient",
      "wrong",
      "declined",
    ];

    const isUserError = userMessages.some((msg) => errorMessage.includes(msg));
    const { USER_ERROR, GATEWAY_ERROR } = PAYMENT.ERROR_TYPES;

    return isUserError ? USER_ERROR : GATEWAY_ERROR;
  }
}
