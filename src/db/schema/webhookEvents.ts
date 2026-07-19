import { uuid } from "drizzle-orm/pg-core";
import { pgTable, text, jsonb, boolean, timestamp } from "drizzle-orm/pg-core";
import { gatewaysEnum } from "./enum";

export const WebhookEventsTable = pgTable("webhook_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  gateway: gatewaysEnum("gateway").notNull(),
  eventId: text("event_id").notNull().unique(),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull(),
  processed: boolean("processed").default(false),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
