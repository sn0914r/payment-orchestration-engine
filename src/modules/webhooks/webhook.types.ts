import { PaymentsTable } from "@/db/schema";
import type {
  PaymentAuditEvent,
  PaymentGatewayName,
  PaymentMethod,
  PaymentStatus,
} from "@/types";

export type {
  PaymentAuditEvent,
  PaymentGatewayName,
  PaymentMethod,
  PaymentStatus,
};

export interface ParsedWebhookPayload {
  eventId: string;
  eventType: string;
  gatewayOrderId: string;
  gatewayPaymentId: string;
  newStatus: PaymentStatus | null;
  rawPayload: Record<string, unknown>;
}

export type NormalizedWebhookPayload = {
  eventId: string;
  eventType: string;
  gatewayOrderId: string;
  gatewayPaymentId: string;
};


export type PaymentStatusUpdatePayload = {
  newStatus: PaymentStatus;
  currentStatus: PaymentStatus;
  currentOrder: typeof PaymentsTable.$inferSelect;
  gatewayOrderId: string;
  gatewayPaymentId: string;
  paymentId: string;
  gatewayName: string;
  normalizedEventObject: NormalizedWebhookPayload;
};

export interface PaymentStatusChangedEvent {
  orderId: string;
  paymentId: string;
  status: PaymentStatus;
  gateway: PaymentGatewayName;
  amount: number;
  method: PaymentMethod;
  gatewayPaymentId?: string;
}

export type PaymentEventListener = (
  event: PaymentStatusChangedEvent,
) => Promise<void>;
