import type { Request, Response } from "express";
import {
  razorpayWebhookHandler,
  cashfreeWebhookHandler,
} from "./services/index";

export const razorpayWebhookController = async (
  req: Request,
  res: Response,
) => {
  await razorpayWebhookHandler(req);

  res.status(200).json({ success: true });
};

export const cashfreeWebhookController = async (
  req: Request,
  res: Response,
) => {
  await cashfreeWebhookHandler(req);

  res.status(200).json({ success: true });
};
