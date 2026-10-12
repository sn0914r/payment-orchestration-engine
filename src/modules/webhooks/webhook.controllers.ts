import type { Request, Response } from "express";
import { logger } from "@/utils/logger";
import { PAYMENT } from "@/constants";
import { WebhookProcessorFactory } from "./webhook.service";
import type { PaymentGatewayName } from "./webhook.types";

export class WebhookController {
  private static async handle(
    gateway: PaymentGatewayName,
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const processor = WebhookProcessorFactory.getProcessor(gateway);
      await processor.execute(req.body, req.headers);
    } catch (error) {
      logger.error(
        { error, gateway },
        `${gateway} webhook processing failed internally`,
      );
    }

    res.status(200).json({ success: true });
  }

  public static async razorpay(req: Request, res: Response): Promise<void> {
    await WebhookController.handle(PAYMENT.GATEWAYS.RAZORPAY, req, res);
  }

  public static async cashfree(req: Request, res: Response): Promise<void> {
    await WebhookController.handle(PAYMENT.GATEWAYS.CASHFREE, req, res);
  }
}
