import type { Request, Response, NextFunction } from "express";
import { ReconciliationService } from "./reconciliation.service";

export class ReconciliationController {
  static async triggerReconciliation(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { date, gateway } = req.body;
      const result = await ReconciliationService.run({ date, gateway });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getReconciliationRuns(
    _req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const runs = await ReconciliationService.getRuns();
      res.status(200).json(runs);
    } catch (error) {
      next(error);
    }
  }

  static async getRunMismatches(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { runId } = req.params;
      const mismatches = await ReconciliationService.getRunMismatches(
        runId as string,
      );
      res.status(200).json(mismatches);
    } catch (error) {
      next(error);
    }
  }

  static async resolveMismatch(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id } = req.params;
      const { note } = req.body;
      const resolved = await ReconciliationService.resolveMismatch(
        id as string,
        note,
      );
      res.status(200).json(resolved);
    } catch (error) {
      next(error);
    }
  }
}
