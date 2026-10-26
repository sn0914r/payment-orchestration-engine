import { Router } from "express";
import { validator } from "@/middlewares/validation";
import { idempotencyMiddleware } from "./refund.middlewares";
import { RefundController } from "./refund.controller";
import {
  InitiateRefundSchema,
  RefundIdParamSchema,
  PaymentIdParamSchema,
} from "./refund.schemas";

export const refundRouter = Router();

refundRouter.post(
  "/",
  idempotencyMiddleware,
  validator(InitiateRefundSchema),
  RefundController.initiateRefund,
);

refundRouter.get(
  "/:id",
  validator(RefundIdParamSchema, "params"),
  RefundController.getRefundById,
);

refundRouter.get(
  "/payment/:paymentId",
  validator(PaymentIdParamSchema, "params"),
  RefundController.getRefundsByPaymentId,
);
