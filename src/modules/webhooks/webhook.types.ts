import { PAYMENT } from "@/constants";

export type PaymentStatus =
  (typeof PAYMENT.STATUS)[keyof typeof PAYMENT.STATUS];
