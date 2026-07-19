ALTER TABLE "webhook_events" DROP CONSTRAINT "webhook_events_event_type_unique";--> statement-breakpoint
ALTER TABLE "webhook_events" ADD COLUMN "event_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_event_id_unique" UNIQUE("event_id");