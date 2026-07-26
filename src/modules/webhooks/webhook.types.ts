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
