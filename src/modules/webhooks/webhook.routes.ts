import { Router } from "express";
import {
  cashfreeWebhookController,
  razorpayWebhookController,
} from "./webhook.controllers";
import express from "express";

export const webhookRouter = Router();

webhookRouter.post(
  "/razorpay",
  express.raw({ type: "application/json" }),
  razorpayWebhookController,
);

webhookRouter.post(
  "/cashfree",
  express.raw({ type: "application/json" }),
  cashfreeWebhookController,
);
