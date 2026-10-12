import express, { Router } from "express";
import { WebhookController } from "./webhook.controllers";

export const webhookRouter = Router();

webhookRouter.post(
  "/razorpay",
  express.raw({ type: "application/json" }),
  WebhookController.razorpay,
);

webhookRouter.post(
  "/cashfree",
  express.raw({ type: "application/json" }),
  WebhookController.cashfree,
);
