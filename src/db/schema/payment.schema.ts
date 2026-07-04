import { PAYMENT } from "@/constants/payment";
import {
  pgTable,
  uuid,
  varchar,
  text,
  pgEnum,
  integer,
  timestamp,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const gatewayEnum = pgEnum(
  "gateway",
  Object.values(PAYMENT.GATEWAYS) as [string, ...string[]],
);
export const statusEnum = pgEnum(
  "status",
  Object.values(PAYMENT.STATUS) as [string, ...string[]],
);
export const methodEnum = pgEnum(
  "method",
  Object.values(PAYMENT.METHOD) as [string, ...string[]],
);

export const PaymentsTable = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    idempotencyKey: text("idempotency_key").notNull().unique(),
    orderId: text("order_id").notNull(),

    gateway: gatewayEnum("gateway").notNull(),
    gatewayOrderId: text("gateway_order_id").notNull().unique(),
    gatewayPaymentId: text("gateway_payment_id").unique(),

    status: statusEnum("status").notNull().default(PAYMENT.STATUS.INITIATED),
    method: methodEnum("method").notNull(),

    amount: integer("amount_in_paise").notNull(),
    currency: varchar("currency", { length: 3 }).default("INR"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [check("amount_positive", sql`${table.amount} > 0`)],
);
