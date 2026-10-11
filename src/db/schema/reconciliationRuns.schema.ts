import { pgTable, uuid, date, integer, timestamp } from "drizzle-orm/pg-core";
import { gatewaysEnum, reconciliationRunStatusEnum } from "./enum";
import { RECONCILIATION } from "@/constants";

export const ReconciliationRunsTable = pgTable("reconciliation_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  runDate: date("run_date").notNull(),
  gateway: gatewaysEnum("gateway").notNull(),
  status: reconciliationRunStatusEnum("status")
    .notNull()
    .default(RECONCILIATION.STATUS.RUNNING),
  totalTransactions: integer("total_transactions").default(0).notNull(),
  matchedCount: integer("matched_count").default(0).notNull(),
  mismatchCount: integer("mismatch_count").default(0).notNull(),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
