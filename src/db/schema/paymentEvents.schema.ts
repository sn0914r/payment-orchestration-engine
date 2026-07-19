import { pgTable, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { PaymentsTable } from "./payment.schema";
import { paymentEventTriggerEnum, paymentStatusEnum } from "./enum";

export const PaymentsEventsTable = pgTable("payment_events", {
  id: uuid("id").defaultRandom().primaryKey(),

  paymentId: uuid("payment_id")
    .notNull()
    .references(() => PaymentsTable.id),

  fromStatus: paymentStatusEnum("from_status"),
  toStatus: paymentStatusEnum("to_status").notNull(),
  trigger: paymentEventTriggerEnum("trigger").notNull(),
  payload: jsonb("payload"),

  createdAt: timestamp("created_at").defaultNow(),
});
