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
import { gatewaysEnum, paymentMethodEnum, paymentStatusEnum } from "./enum";

export const PaymentsTable = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    idempotencyKey: text("idempotency_key").notNull().unique(),
    orderId: text("order_id").notNull(),

    gateway: gatewaysEnum("gateway"),
    gatewayOrderId: text("gateway_order_id").unique(),
    gatewayPaymentId: text("gateway_payment_id").unique(),

    status: paymentStatusEnum("status")
      .notNull()
      .default(PAYMENT.STATUS.INITIATED),
    method: paymentMethodEnum("method").notNull(),

    amount: integer("amount_in_paise").notNull(),
    currency: varchar("currency", { length: 3 }).default("INR"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [check("amount_positive", sql`${table.amount} > 0`)],
);
