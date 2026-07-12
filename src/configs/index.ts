import "dotenv/config";

export const configs = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || "development",
  DATABASE_URL: process.env.DATABASE_URL,
  RAZORPAY: {
    KEY_ID: process.env.RAZORPAY_KEY_ID,
    KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
    WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
  },
  CASHFREE: {
    CLIENT_ID: process.env.CASHFREE_CLIENT_ID,
    CLIENT_SECRET: process.env.CASHFREE_CLIENT_SECRET,
  },
};
