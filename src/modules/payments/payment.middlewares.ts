import { AppError } from "@/errors/AppError";
import { ERRORCODES, PAYMENT } from "@/constants";
import type { Request, Response, NextFunction } from "express";
import { PaymentService } from "./payment.service";
import { PaymentRepository } from "./payment.repository";

export const idempotencyMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const idempotencyKey = req.headers["idempotency-key"] as string | undefined;

  if (!idempotencyKey) {
    throw new AppError(
      "idempotency-key header is missing",
      400,
      ERRORCODES.IDEMPOTENCY_KEY_REQUIRED,
    );
  }

  const order = await PaymentRepository.findByIdempotencyKey(idempotencyKey);

  if (order && order.status === PAYMENT.STATUS.SUCCESS) {
    const transformedOrder = PaymentService.transformPaymentRecord(order);
    return res.status(200).json({
      success: true,
      message:
        "Request has already been processed. Returning the existing payment",
      data: transformedOrder,
    });
  }

  next();
};
