import { Router } from "express";
import { razorpayWebhookController } from "./webhook.controllers";
import express from "express";
import { cashfreeWebhookHandler } from "./services/cashfreeWebhookHandler";

export const webhookRouter = Router();

webhookRouter.post(
  "/razorpay",
  express.raw({ type: "application/json" }),
  razorpayWebhookController,
);

webhookRouter.post(
  "/cashfree",
  express.raw({ type: "application/json" }),
  cashfreeWebhookHandler,
);
