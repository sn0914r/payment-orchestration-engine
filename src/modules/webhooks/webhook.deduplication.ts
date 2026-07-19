import { db } from "@/clients/pgsql";
import { WebhookEventsTable } from "@/db/schema/webhookEvents";
import { logger } from "@/utils/logger";
import { eq } from "drizzle-orm";

export const deduplicateWebhook = async (
  gateway: string,
  eventId: string,
  eventType: string,
  payload: Record<string, any>,
): Promise<boolean> => {
  try {
    await db.insert(WebhookEventsTable).values({
      gateway,
      eventId,
      eventType,
      payload,
    });

    return false;
  } catch (error) {
    if ((error as any).code === "23505") {
      logger.warn({ eventId, gateway }, "duplicate webhook received, ignoring");
      return true;
    }

    throw error;
  }
};

export const markWebhookProcessed = async (eventId: string) => {
  await db
    .update(WebhookEventsTable)
    .set({ processed: true, processedAt: new Date() })
    .where(eq(WebhookEventsTable.eventId, eventId));
};
