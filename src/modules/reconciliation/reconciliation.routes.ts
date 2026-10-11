import { Router } from "express";
import { validator } from "@/middlewares/validation";
import {
  triggerReconciliationController,
  getReconciliationRunsController,
  getRunMismatchesController,
  resolveMismatchController,
} from "./reconciliation.controller";
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
  triggerReconciliationController,
);

reconciliationRouter.get("/runs", getReconciliationRunsController);

reconciliationRouter.get(
  "/runs/:runId/mismatches",
  validator(RunIdParamSchema, "params"),
  getRunMismatchesController,
);

reconciliationRouter.patch(
  "/mismatches/:id/resolve",
  validator(MismatchIdParamSchema, "params"),
  validator(ResolveMismatchSchema),
  resolveMismatchController,
);
