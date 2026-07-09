import { PAYMENT } from "@/constants";

export interface InitiatePaymentReqBody {
  amount: number;
  method: string;
  orderId: string;
  currency?: string;
  idempotencyKey: string;
}

export interface InitiatePaymentResData {
  gatewayOrderId: string;
  gateway: string;
  method?: string;
}

export interface InitiatePaymentReturn extends InitiatePaymentResData {
  paymentMethod: string;
}

export interface PaymentRecord {
  id: string;
  idempotencyKey: string;
  orderId: string;
  gateway: string;
  gatewayOrderId: string;
  gatewayPaymentId: string | null;
  status: string;
  method: string;
  amount: number;
  currency: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}
