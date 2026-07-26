import crypto from "crypto";
import type { NotifyClientType } from "./webhook.types";
import { configs } from "@/configs";
import { logger } from "@/utils/logger";

export const notifyClient = async (payload: NotifyClientType) => {
  const signature = crypto
    .createHmac("sha256", configs.INTERNAL_API_KEY)
    .update(JSON.stringify(payload))
    .digest("hex");

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
    }
  } catch (error) {
    logger.error({ err: error, orderId: payload.orderId }, "failed to notify eKart");
  }
};
