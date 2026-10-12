import { db } from "@/clients/pgsql";
import {
  PaymentsEventsTable,
  PaymentsTable,
  WebhookEventsTable,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/utils/logger";
import type { PaymentAuditEvent, PaymentStatus } from "./webhook.types";

export class WebhookRepository {
  public static async findOrderByGatewayOrderId(gatewayOrderId: string) {
    const [order] = await db
      .select()
      .from(PaymentsTable)
      .where(eq(PaymentsTable.gatewayOrderId, gatewayOrderId));

    return order;
  }

  public static async updatePaymentStatus(
    gatewayOrderId: string,
    gatewayPaymentId: string,
    status: PaymentStatus,
  ) {
    await db
      .update(PaymentsTable)
      .set({ status, gatewayPaymentId })
      .where(eq(PaymentsTable.gatewayOrderId, gatewayOrderId));
  }

  public static async recordEvent(
    gateway: string,
    eventId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<boolean> {
    try {
      await db.insert(WebhookEventsTable).values({
        gateway,
        eventId,
        eventType,
        payload,
      });

      return false;
    } catch (error) {
      if ((error as { code?: string }).code === "23505") {
        logger.warn(
          { eventId, gateway },
          "duplicate webhook received, ignoring",
        );

        return true;
      }

      throw error;
    }
  }

  public static async markProcessed(eventId: string) {
    await db
      .update(WebhookEventsTable)
      .set({ processed: true, processedAt: new Date() })
      .where(eq(WebhookEventsTable.eventId, eventId));
  }

  public static async logPaymentEvent(paymentEventData: PaymentAuditEvent) {
    await db.insert(PaymentsEventsTable).values(paymentEventData);
  }
}
