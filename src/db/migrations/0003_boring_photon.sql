ALTER TYPE "public"."payment_event_trigger" ADD VALUE 'routing_decision';--> statement-breakpoint
ALTER TYPE "public"."payment_event_trigger" ADD VALUE 'gateway_error';--> statement-breakpoint
ALTER TYPE "public"."payment_event_trigger" ADD VALUE 'fallback';--> statement-breakpoint
ALTER TYPE "public"."payment_event_trigger" ADD VALUE 'webhook_duplicated';--> statement-breakpoint
ALTER TYPE "public"."payment_event_trigger" ADD VALUE 'retry_queued';--> statement-breakpoint
ALTER TYPE "public"."payment_event_trigger" ADD VALUE 'retry_attempt';--> statement-breakpoint
ALTER TABLE "payment_events" ADD COLUMN "payload" jsonb;