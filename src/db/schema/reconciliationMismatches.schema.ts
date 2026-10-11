import { pgTable, uuid, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { ReconciliationRunsTable } from "./reconciliationRuns.schema";
import { PaymentsTable } from "./payment.schema";
import { gatewaysEnum, reconciliationMismatchTypeEnum } from "./enum";

export const ReconciliationMismatchesTable = pgTable(
  "reconciliation_mismatches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runId: uuid("run_id")
      .notNull()
      .references(() => ReconciliationRunsTable.id),
    paymentId: uuid("payment_id").references(() => PaymentsTable.id),

    gateway: gatewaysEnum("gateway").notNull(),
    gatewayPaymentId: text("gateway_payment_id"),

    mismatchType: reconciliationMismatchTypeEnum("mismatch_type").notNull(),

    ourAmount: integer("our_amount_in_paise"),
    gatewayAmount: integer("gateway_amount_in_paise"),

    ourStatus: text("our_status"),
    gatewayStatus: text("gateway_status"),

    resolved: boolean("resolved").default(false).notNull(),
    resolutionNote: text("resolution_note"),
    resolvedAt: timestamp("resolved_at"),

    createdAt: timestamp("created_at").defaultNow(),
  },
);
