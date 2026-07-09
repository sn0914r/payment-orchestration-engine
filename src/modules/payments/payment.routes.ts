import { Router } from "express";
import { idempotencyMiddleware } from "./payment.middlewares";
import {
  getPaymentRecordController,
  initiatePaymentController,
} from "./payment.controllers";
import { validator } from "@/middlewares/validation";
import { InitiatePaymentSchema, PaymentIdSchema } from "./payment.schemas";

export const paymentRouter = Router();

paymentRouter.post(
  "/initiate",
  idempotencyMiddleware,
  validator(InitiatePaymentSchema),
  initiatePaymentController,
);

paymentRouter.get(
  "/:id",
  validator(PaymentIdSchema, "params"),
  getPaymentRecordController,
);
