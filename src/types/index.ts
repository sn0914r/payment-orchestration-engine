import { PAYMENT } from "@/constants";

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

export interface CashfreeRequestShape {
  order_id: string;
  order_amount: number;
  order_currency?: "INR";
  customer_details: {
    customer_id: string;
    customer_phone: string;
    customer_email?: string;
  };
}

export type PaymentMethod =
  (typeof PAYMENT.METHOD)[keyof typeof PAYMENT.METHOD];

export type PaymentStatus =
  (typeof PAYMENT.STATUS)[keyof typeof PAYMENT.STATUS];

export type PaymentTriggeredBy =
  (typeof PAYMENT.TRIGGERS)[keyof typeof PAYMENT.TRIGGERS];

export type GatewayAttemptStatus =
  (typeof PAYMENT.GATEWAY_ATTEMPTS_STATUS)[keyof typeof PAYMENT.GATEWAY_ATTEMPTS_STATUS];
