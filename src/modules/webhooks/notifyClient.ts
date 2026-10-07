import crypto from "crypto";
import type { NotifyClientType } from "./webhook.types";
import { configs } from "@/configs";
import { logger } from "@/utils/logger";

export const notifyClient = async (payload: NotifyClientType) => {
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
        { orderId: payload.orderId, status: response.status },
        "eKart webhook returned an error status",
      );
    } else {
      logger.info(
        { orderId: payload.orderId, status: response.status },
        "Client webhook delivered successfully",
      );
    }
  } catch (error) {
    logger.error({ err: error, orderId: payload.orderId }, "failed to notify eKart");
  }
};
