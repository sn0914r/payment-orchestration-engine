import { PAYMENT } from "@/constants/payment";
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { gatewaysEnum, refundStatusEnum } from "./enum";
import { PaymentsTable } from "./payment.schema";

export const RefundsTable = pgTable(
  "refunds",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    idempotencyKey: text("idempotency_key").notNull().unique(),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => PaymentsTable.id, { onDelete: "cascade" }),

    gateway: gatewaysEnum("gateway").notNull(),
    gatewayRefundId: text("gateway_refund_id").unique(),

    amount: integer("amount_in_paise").notNull(),
    currency: varchar("currency", { length: 3 }).default("INR"),

    status: refundStatusEnum("status")
      .notNull()
      .default(PAYMENT.REFUND_STATUS.PENDING),

    reason: text("reason"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [check("refund_amount_positive", sql`${table.amount} > 0`)],
);
