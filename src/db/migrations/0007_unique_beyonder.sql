CREATE TYPE "public"."reconciliation_mismatch_type" AS ENUM('MISSING_IN_GATEWAY', 'MISSING_IN_DB', 'AMOUNT_MISMATCH', 'STATUS_MISMATCH');--> statement-breakpoint
CREATE TYPE "public"."reconciliation_run_status" AS ENUM('RUNNING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TABLE "reconciliation_mismatches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"payment_id" uuid,
	"gateway" "gateway" NOT NULL,
	"gateway_payment_id" text,
	"mismatch_type" "reconciliation_mismatch_type" NOT NULL,
	"our_amount_in_paise" integer,
	"gateway_amount_in_paise" integer,
	"our_status" text,
	"gateway_status" text,
	"resolved" boolean DEFAULT false NOT NULL,
	"resolution_note" text,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reconciliation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_date" date NOT NULL,
	"gateway" "gateway" NOT NULL,
	"status" "reconciliation_run_status" DEFAULT 'RUNNING' NOT NULL,
	"total_transactions" integer DEFAULT 0 NOT NULL,
	"matched_count" integer DEFAULT 0 NOT NULL,
	"mismatch_count" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "reconciliation_mismatches" ADD CONSTRAINT "reconciliation_mismatches_run_id_reconciliation_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."reconciliation_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_mismatches" ADD CONSTRAINT "reconciliation_mismatches_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;