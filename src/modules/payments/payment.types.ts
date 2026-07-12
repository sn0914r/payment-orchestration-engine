export interface InitiatePaymentReqBody {
  amount: number;
  method: string;
  orderId: string;
  currency?: string;
  customer: {
    id: string;
    phone: string;
    email: string;
  };
}

export interface InitiatePaymentResData {
  orderId: string;
  gateway: string;
  method: string;
  paymentLink?: string;
  keyId?: string;
}

export interface InitiatePaymentReturn {
  orderId: string;
  gateway: string;
  paymentLink?: string;
  keyId?: string;
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
