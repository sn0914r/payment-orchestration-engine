import { PAYMENT } from "@/constants/payment";

export type PaymentGateway =
  (typeof PAYMENT.GATEWAYS)[keyof typeof PAYMENT.GATEWAYS];

export interface InitiatePaymentData {
  amount: number;
  method: string;
  currency?: string;
  orderId: string;
  customer: {
    id: string;
    phone: string;
    email?: string;
  };
}

export interface GatewayResponse {
  gatewayOrderId: string;
  paymentLink?: string;
  keyId?: string;
}

export type GatewayStatusResponse = {
  status: string;
};

export interface Gateway {
  initiatePayment: (data: InitiatePaymentData) => Promise<GatewayResponse>;
  verifyWebhook: (
    payload: unknown,
    signature: string,
    timestamp?: string,
  ) => boolean;
  getPaymentStatus: (orderId: string) => Promise<GatewayStatusResponse>;
  classifyError: (err: any) => string;
}
