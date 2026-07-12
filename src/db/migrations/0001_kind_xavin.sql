CREATE TYPE "public"."payment_error_type" AS ENUM('GATEWAY_ERROR', 'USER_ERROR');--> statement-breakpoint
CREATE TYPE "public"."payment_gateway_status" AS ENUM('SUCCESS', 'FAILED', 'ERROR');--> statement-breakpoint
ALTER TYPE "public"."gateway" ADD VALUE 'cashfree';--> statement-breakpoint
CREATE TABLE "gateway_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"gateway" "gateway" NOT NULL,
	"status" "payment_gateway_status" NOT NULL,
	"error_code" text,
	"error_type" "payment_error_type",
	"attempted_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "gateway_attempts" ADD CONSTRAINT "gateway_attempts_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;