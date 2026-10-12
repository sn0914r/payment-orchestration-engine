import crypto from "crypto";
import type { PaymentStatusChangedEvent } from "./webhook.types";
import { configs } from "@/configs";
import { logger } from "@/utils/logger";

export class ClientNotifier {
  public static async notify(
    payload: PaymentStatusChangedEvent,
  ): Promise<void> {
    const signature = crypto
      .createHmac("sha256", configs.INTERNAL_API_KEY)
      .update(JSON.stringify(payload))
      .digest("hex");

    logger.info(
      {
        orderId: payload.orderId,
        status: payload.status,
        gateway: payload.gateway,
        endpoint: configs.CLIENT_WEBHOOK_API,
      },
      "Firing webhook to client",
    );

    try {
      const response = await fetch(configs.CLIENT_WEBHOOK_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-poe-webhook-signature": signature,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        logger.error(
          {
            orderId: payload.orderId,
            status: response.status,
          },
          "client webhook returned an error status",
        );
      } else {
        logger.info(
          {
            orderId: payload.orderId,
            status: response.status,
          },
          "Client webhook delivered successfully",
        );
      }
    } catch (error) {
      logger.error(
        { err: error, orderId: payload.orderId },
        "failed to notify client",
      );
    }
  }
}
