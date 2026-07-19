import { uuid } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import { gatewayEnum } from "./payment.schema";
import { text } from "drizzle-orm/pg-core";
import { jsonb } from "drizzle-orm/pg-core";
import { boolean } from "drizzle-orm/pg-core";
import { timestamp } from "drizzle-orm/pg-core";

export const WebhookEventsTable = pgTable("webhook_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  gateway: gatewayEnum("gateway").notNull(),
  eventId: text("event_id").notNull().unique(),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull(),
  processed: boolean("processed").default(false),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
