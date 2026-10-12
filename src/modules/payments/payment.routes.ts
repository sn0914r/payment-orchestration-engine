import { Router } from "express";
import { idempotencyMiddleware } from "./payment.middlewares";
import { PaymentController } from "./payment.controllers";
import { validator } from "@/middlewares/validation";
import { InitiatePaymentSchema, PaymentIdSchema } from "./payment.schemas";

export const paymentRouter = Router();

paymentRouter.post(
  "/initiate",
  idempotencyMiddleware,
  validator(InitiatePaymentSchema),
  PaymentController.initiate,
);

paymentRouter.get(
  "/:id",
  validator(PaymentIdSchema, "params"),
  PaymentController.getById,
);
