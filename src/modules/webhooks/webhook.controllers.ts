import type { Request, Response } from "express";
import { razorpayWebhookHandler } from "./services/razorpayWebhookHandler";

export const razorpayWebhookController = async (
  req: Request,
  res: Response,
) => {
  await razorpayWebhookHandler(req);

  res.status(200).json({ success: true });
};
