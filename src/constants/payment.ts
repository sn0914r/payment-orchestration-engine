export const PAYMENT = {
  GATEWAYS: {
    RAZORPAY: "razorpay",
  },

  STATUS: {
    INITIATED: "initiated",
    PROCESSING: "processing",
    SUCCESS: "success",
    FAILED: "failed",
  },

  METHOD: {
    CARD: "card",
    NETBANKING: "netbanking",
    WALLET: "wallet",
    EMI: "emi",
    UPI: "upi",
  },

  TRIGGERS: {
    API_CALL: "api_call",
    WEBHOOK_RECEIVED: "webhook_received",
  },
} as const;
