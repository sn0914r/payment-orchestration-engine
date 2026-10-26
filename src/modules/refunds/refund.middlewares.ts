import { AppError } from "@/errors/AppError";
import { ERRORCODES, PAYMENT } from "@/constants";
import type { Request, Response, NextFunction } from "express";
import { RefundService } from "./refund.service";
import { RefundRepository } from "./refund.repository";

export const idempotencyMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const idempotencyKey =
    (req.headers["idempotency-key"] as string | undefined) ||
    req.body?.idempotencyKey;

  if (!idempotencyKey) {
    throw new AppError(
      "idempotency-key header is missing",
      400,
      ERRORCODES.IDEMPOTENCY_KEY_REQUIRED,
    );
  }

  const refund = await RefundRepository.findByIdempotencyKey(idempotencyKey);

  if (refund && refund.status === PAYMENT.REFUND_STATUS.PROCESSED) {
    const transformedRefund = RefundService.transformRefundRecord(refund);
    return res.status(200).json({
      success: true,
      message:
        "Request has already been processed. Returning the existing refund",
      data: transformedRefund,
    });
  }

  next();
};
