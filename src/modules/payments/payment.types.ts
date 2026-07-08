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
