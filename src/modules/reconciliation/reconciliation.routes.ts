import { Router } from "express";
import { validator } from "@/middlewares/validation";
import { ReconciliationController } from "./reconciliation.controller";
import {
  TriggerReconciliationSchema,
  RunIdParamSchema,
  MismatchIdParamSchema,
  ResolveMismatchSchema,
} from "./reconciliation.schemas";

export const reconciliationRouter = Router();

reconciliationRouter.post(
  "/run",
  validator(TriggerReconciliationSchema),
  ReconciliationController.triggerReconciliation,
);

reconciliationRouter.get(
  "/runs",
  ReconciliationController.getReconciliationRuns,
);

reconciliationRouter.get(
  "/runs/:runId/mismatches",
  validator(RunIdParamSchema, "params"),
  ReconciliationController.getRunMismatches,
);

reconciliationRouter.patch(
  "/mismatches/:id/resolve",
  validator(MismatchIdParamSchema, "params"),
  validator(ResolveMismatchSchema),
  ReconciliationController.resolveMismatch,
);
