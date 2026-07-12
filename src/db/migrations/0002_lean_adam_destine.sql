ALTER TABLE "payments" ALTER COLUMN "gateway" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "gateway_order_id" DROP NOT NULL;