import { Router } from "express";
import { idempotencyMiddleware } from "./payment.middlewares";
import { initiatePaymentController } from "./payment.controllers";

export const paymentRouter = Router();

paymentRouter.post(
  "/initiate",
  idempotencyMiddleware,
  initiatePaymentController,
);
