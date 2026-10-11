import type { Request, Response, NextFunction } from "express";
import {
  runReconciliationService,
  getReconciliationRunsService,
  getRunMismatchesService,
  resolveMismatchService,
} from "./reconciliation.service";

export const triggerReconciliationController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { date, gateway } = req.body;
    const result = await runReconciliationService({ date, gateway });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getReconciliationRunsController = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const runs = await getReconciliationRunsService();
    res.status(200).json(runs);
  } catch (error) {
    next(error);
  }
};

export const getRunMismatchesController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { runId } = req.params;
    const mismatches = await getRunMismatchesService(runId as string);
    res.status(200).json(mismatches);
  } catch (error) {
    next(error);
  }
};

export const resolveMismatchController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const resolved = await resolveMismatchService(id as string, note);
    res.status(200).json(resolved);
  } catch (error) {
    next(error);
  }
};
