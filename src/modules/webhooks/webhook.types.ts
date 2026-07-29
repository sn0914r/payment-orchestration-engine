import { PaymentsTable } from "@/db/schema";
import type { PaymentStatus } from "@/types";

export type NormalizedWebhookPayload = {
  eventId: string;
  eventType: string;
  gatewayOrderId: string;
  gatewayPaymentId: string;
};

export type NotifyClientType = {
  orderId: string;
  status: string;
  gateway: string;
  amount: number;
  method: string;
  gatewayPaymentId: string;
  paymentId: string;
};

export type ProcessPaymentProps = {
  newStatus: PaymentStatus;
  currentStatus: PaymentStatus;
  currentOrder: typeof PaymentsTable.$inferSelect;
  gatewayOrderId: string;
  gatewayPaymentId: string;
  paymentId: string;
  gatewayName: string;
  normalizedEventObject: NormalizedWebhookPayload;
};
