import { eq } from "drizzle-orm";
import { db } from "@/clients/pgsql";
import { ERRORCODES, PAYMENT } from "@/constants";
import { PaymentsTable } from "@/db/schema";
import { AppError } from "@/errors/AppError";
import type { Request, Response, NextFunction } from "express";
import { formatPaymentRecord } from "./payment.helpers";
import type { PaymentRecord } from "./payment.types";

export const idempotencyMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const idempotencyKey = req.headers["idempotency-key"];

  if (!idempotencyKey) {
    throw new AppError(
      "idempotency-key header is missing",
      400,
      ERRORCODES.IDEMPOTENCY_KEY_REQUIRED,
    );
  }

  const [order] = await db
    .select()
    .from(PaymentsTable)
    .where(eq(PaymentsTable.idempotencyKey, idempotencyKey as string))
    .limit(1);

  if (order && order.status === PAYMENT.STATUS.SUCCESS) {
    const formattedOrder = formatPaymentRecord(order as PaymentRecord);
    return res.status(200).json({
      success: true,
      message:
        "Request has already been processed. Returning the existing payment",
      data: formattedOrder,
    });
  }

  next();
};
