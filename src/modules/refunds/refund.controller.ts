import type { Request, Response, NextFunction } from "express";
import { RefundService } from "./refund.service";

export class RefundController {
  static async initiateRefund(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { paymentId, amountInRupees, reason } = req.body;
      const idempotencyKey =
        (req.headers["idempotency-key"] as string) || req.body.idempotencyKey;

      const result = await RefundService.initiateRefund({
        paymentId,
        amountInRupees,
        idempotencyKey,
        reason,
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getRefundById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const result = await RefundService.getRefundById(id as string);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getRefundsByPaymentId(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { paymentId } = req.params;
      const result = await RefundService.getRefundsByPaymentId(
        paymentId as string,
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
