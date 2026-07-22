import type { Request, Response } from "express";
import {
  razorpayWebhookHandler,
  cashfreeWebhookHandler,
} from "./services/index";
import { logger } from "@/utils/logger";

export const razorpayWebhookController = async (
  req: Request,
  res: Response,
) => {
  try {
    await razorpayWebhookHandler(req);
  } catch (err) {
    logger.error({ err }, "Razorpay webhook processing failed internally");
  }

  res.status(200).json({ success: true });
};

export const cashfreeWebhookController = async (
  req: Request,
  res: Response,
) => {
  try {
    await cashfreeWebhookHandler(req);
  } catch (err) {
    logger.error({ err }, "Cashfree webhook processing failed internally");
  }

  res.status(200).json({ success: true });
};
