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
    ROUTING_DECISION: "routing_decision",
    GATEWAY_ERROR: "gateway_error",
    USER_ERROR: "user_error",
    FALLBACK: "fallback",
    WEBHOOK_DUPLICATED: "webhook_duplicated",
    RETRY_QUEUED: "retry_queued",
    RETRY_ATTEMPT: "retry_attempt",
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
