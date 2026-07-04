import { pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { PaymentsTable, statusEnum } from "./payment.schema";
import { pgEnum } from "drizzle-orm/pg-core";
import { PAYMENT } from "@/constants";

export const triggerEnum = pgEnum(
  "payment_event_trigger",
  Object.values(PAYMENT.TRIGGERS) as [string, ...string[]],
);

export const PaymentsEventsTable = pgTable("payment_events", {
  id: uuid("id").defaultRandom().primaryKey(),

  paymentId: uuid("payment_id")
    .notNull()
    .references(() => PaymentsTable.id),

  fromStatus: statusEnum("from_status"),
  toStatus: statusEnum("to_status").notNull(),
  trigger: triggerEnum("trigger").notNull(),

  createdAt: timestamp("created_at").defaultNow(),
});
