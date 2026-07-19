ALTER TYPE "public"."payment_event_trigger" ADD VALUE 'user_error' BEFORE 'fallback';--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gateway" "gateway" NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"processed" boolean DEFAULT false,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
