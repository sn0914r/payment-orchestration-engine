import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().default("3000"),
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  RAZORPAY_KEY_ID: z.string().min(1, "RAZORPAY_KEY_ID is required"),
  RAZORPAY_KEY_SECRET: z.string().min(1, "RAZORPAY_KEY_SECRET is required"),
  RAZORPAY_WEBHOOK_SECRET: z
    .string()
    .min(1, "RAZORPAY_WEBHOOK_SECRET is required"),
  CASHFREE_CLIENT_ID: z.string().min(1, "CASHFREE_CLIENT_ID is required"),
  CASHFREE_CLIENT_SECRET: z
    .string()
    .min(1, "CASHFREE_CLIENT_SECRET is required"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Missing or invalid environment variables:");
  process.exit(1);
}

export const configs = {
  PORT: parsed.data.PORT,
  NODE_ENV: parsed.data.NODE_ENV,
  DATABASE_URL: parsed.data.DATABASE_URL,
  RAZORPAY: {
    KEY_ID: parsed.data.RAZORPAY_KEY_ID,
    KEY_SECRET: parsed.data.RAZORPAY_KEY_SECRET,
    WEBHOOK_SECRET: parsed.data.RAZORPAY_WEBHOOK_SECRET,
  },
  CASHFREE: {
    CLIENT_ID: parsed.data.CASHFREE_CLIENT_ID,
    CLIENT_SECRET: parsed.data.CASHFREE_CLIENT_SECRET,
  },
};
