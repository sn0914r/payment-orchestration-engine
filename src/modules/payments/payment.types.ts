import { PaymentGateway } from "../gateways/gateway.types";
import {
  PaymentMethod,
  PaymentStatus,
  PaymentTriggeredBy,
  GatewayAttemptStatus,
} from "@/types";

export interface InitiatePaymentType {
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

export interface PaymentEventType {
  paymentId: string;
  fromStatus: PaymentStatus | null;
  toStatus: PaymentStatus;
  trigger: PaymentTriggeredBy;
  payload: Record<string, unknown>;
}

export interface GatewayAttemptType {
  paymentId: string;
  gateway: PaymentGateway;
  status: GatewayAttemptStatus;
  errorType?: string;
  errorCode?: string;
}

export interface InitiatePaymentReturnType {
  paymentId: string;
  orderId?: string | null;
  gateway: PaymentGateway | null;
  paymentLink?: string;
  keyId?: string;
  paymentMethod: PaymentMethod;
}

export interface InitiatePaymentRequestBodyShape {
  amount: number;
  method: string;
  orderId: string;
  customer: {
    id: string;
    phone: string;
    email: string;
  };
}

export interface InitiatePaymentResponseShape {
  paymentId: string;
  orderId?: string | null;
  gateway: string | null;
  paymentMethod: string;
  paymentLink?: string;
  keyId?: string;
}
