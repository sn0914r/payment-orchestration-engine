import { PaymentsTable } from "@/db/schema";
import type {
  ApiResponse,
  PaymentMethod,
  PaymentStatus,
  PaymentTriggeredBy,
  GatewayAttemptStatus,
  PaymentGatewayName,
  PaymentAuditEvent,
} from "@/types";
import type { GatewayResponse } from "../gateways/gateway.types";

export type {
  ApiResponse,
  PaymentMethod,
  PaymentStatus,
  PaymentTriggeredBy,
  GatewayAttemptStatus,
  PaymentGatewayName,
  PaymentAuditEvent,
  GatewayResponse,
};

export type PaymentRecord = typeof PaymentsTable.$inferSelect;

export interface PaymentExecutionResult {
  gateway: PaymentGatewayName;
  response: GatewayResponse;
}

export interface InitiatePaymentInput {
  amountInRupees: number;
  method: PaymentMethod;
  orderId: string;
  idempotencyKey: string;
  customer: {
    id: string;
    phone: string;
    email?: string;
  };
}

export interface GatewayAttemptPayload {
  paymentId: string;
  gateway: PaymentGatewayName;
  status: GatewayAttemptStatus;
  errorType?: string;
  errorCode?: string;
}

export interface InitiatePaymentResult {
  paymentId: string;
  orderId?: string | null;
  gateway: PaymentGatewayName | null;
  paymentLink?: string;
  keyId?: string;
  paymentMethod: PaymentMethod;
}

export interface InitiatePaymentRequestBody {
  amount: number;
  method: string;
  orderId: string;
  customer: {
    id: string;
    phone: string;
    email: string;
  };
}

export interface InitiatePaymentResponseBody {
  paymentId: string;
  orderId?: string | null;
  gateway: string | null;
  paymentMethod: string;
  paymentLink?: string;
  keyId?: string;
}
