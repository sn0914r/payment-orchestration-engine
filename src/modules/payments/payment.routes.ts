import { Router } from "express";
import { idempotencyMiddleware } from "./payment.middlewares";
import {
  getPaymentRecordController,
  initiatePaymentController,
} from "./payment.controllers";

export const paymentRouter = Router();

paymentRouter.post(
  "/initiate",
  idempotencyMiddleware,
  initiatePaymentController,
);

paymentRouter.get("/:id", getPaymentRecordController);
