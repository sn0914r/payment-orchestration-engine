CREATE TYPE "public"."gateway" AS ENUM('razorpay');--> statement-breakpoint
CREATE TYPE "public"."method" AS ENUM('card', 'netbanking', 'wallet', 'emi', 'upi');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('initiated', 'processing', 'success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."payment_event_trigger" AS ENUM('api_call', 'webhook_received');--> statement-breakpoint
CREATE TABLE "payment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"from_status" "status",
	"to_status" "status" NOT NULL,
	"trigger" "payment_event_trigger" NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempotency_key" text NOT NULL,
	"order_id" text NOT NULL,
	"gateway" "gateway" NOT NULL,
	"gateway_order_id" text NOT NULL,
	"gateway_payment_id" text,
	"status" "status" DEFAULT 'initiated' NOT NULL,
	"method" "method" NOT NULL,
	"amount_in_paise" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'INR',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "payments_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "payments_gateway_order_id_unique" UNIQUE("gateway_order_id"),
	CONSTRAINT "payments_gateway_payment_id_unique" UNIQUE("gateway_payment_id"),
	CONSTRAINT "amount_positive" CHECK ("payments"."amount_in_paise" > 0)
);
--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;