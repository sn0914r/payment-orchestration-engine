export const PAYMENT = {
  GATEWAYS: {
    RAZORPAY: "razorpay",
    CASHFREE: "cashfree",
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

  ERROR_TYPES: {
    GATEWAY_ERROR: "GATEWAY_ERROR",
    USER_ERROR: "USER_ERROR",
  },

  GATEWAY_ATTEMPTS_STATUS: {
    SUCCESS: "SUCCESS",
    FAILED: "FAILED",
    ERROR: "ERROR",
  },
} as const;
