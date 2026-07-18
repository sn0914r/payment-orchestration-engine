import { PAYMENT } from "@/constants";

export type PaymentStatus =
  (typeof PAYMENT.STATUS)[keyof typeof PAYMENT.STATUS];

export type NormalizedWebhookPayload = {
  eventId: string;
  eventType: string;
  gatewayOrderId: string;
  gatewayPaymentId: string;
};
