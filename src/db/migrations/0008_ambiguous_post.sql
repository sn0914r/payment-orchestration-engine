CREATE TYPE "public"."refund_status" AS ENUM('pending', 'processed', 'failed');--> statement-breakpoint
ALTER TYPE "public"."status" ADD VALUE 'partially_refunded';--> statement-breakpoint
ALTER TYPE "public"."status" ADD VALUE 'refunded';--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempotency_key" text NOT NULL,
	"payment_id" uuid NOT NULL,
	"gateway" "gateway" NOT NULL,
	"gateway_refund_id" text,
	"amount_in_paise" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'INR',
	"status" "refund_status" DEFAULT 'pending' NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "refunds_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "refunds_gateway_refund_id_unique" UNIQUE("gateway_refund_id"),
	CONSTRAINT "refund_amount_positive" CHECK ("refunds"."amount_in_paise" > 0)
);
--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;