import { pgTable, uuid, pgEnum, timestamp } from "drizzle-orm/pg-core";
import { gatewayEnum, PaymentsTable } from "./payment.schema";
import { text } from "drizzle-orm/pg-core";
import { PAYMENT } from "@/constants";

export const errorEnum = pgEnum(
  "payment_error_type",
  Object.values(PAYMENT.ERROR_TYPES) as [string, ...string[]],
);

export const gatewayStatusEnum = pgEnum(
  "payment_gateway_status",
  Object.values(PAYMENT.GATEWAY_ATTEMPTS_STATUS) as [string, ...string[]],
);

export const GatewayAttempts = pgTable("gateway_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  paymentId: uuid("payment_id")
    .notNull()
    .references(() => PaymentsTable.id),

  gateway: gatewayEnum("gateway").notNull(),
  status: gatewayStatusEnum("status").notNull(),
  errorCode: text("error_code"),
  errorType: errorEnum("error_type"),
  attemptedAt: timestamp("attempted_at").defaultNow(),
});
