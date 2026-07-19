import { pgTable, uuid, timestamp } from "drizzle-orm/pg-core";
import { PaymentsTable } from "./payment.schema";
import { text } from "drizzle-orm/pg-core";
import { errorTypeEnum, gatewayAttemptsStatusEnum, gatewaysEnum } from "./enum";

export const GatewayAttempts = pgTable("gateway_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  paymentId: uuid("payment_id")
    .notNull()
    .references(() => PaymentsTable.id),

  gateway: gatewaysEnum("gateway").notNull(),
  status: gatewayAttemptsStatusEnum("status").notNull(),
  errorCode: text("error_code"),
  errorType: errorTypeEnum("error_type"),
  attemptedAt: timestamp("attempted_at").defaultNow(),
});
