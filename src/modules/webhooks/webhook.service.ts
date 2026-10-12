import { GatewayFactory } from "../gateways/gateway.factory";
import { ERRORCODES, PAYMENT } from "@/constants";
import { WebhookRepository } from "./webhook.repository";
import { logger } from "@/utils/logger";
import type {
  PaymentGatewayName,
  PaymentMethod,
  PaymentStatus,
  ParsedWebhookPayload,
  PaymentStatusUpdatePayload,
} from "./webhook.types";
import { PaymentEventBus } from "./webhook.events";
import { AppError } from "@/errors/AppError";

export abstract class BaseWebhookProcessor {
  protected abstract readonly gateway: PaymentGatewayName;

  protected abstract verifySignature(
    body: unknown,
    headers: Record<string, any>,
  ): boolean;

  protected abstract parseEvent(
    body: unknown,
    headers: Record<string, any>,
  ): ParsedWebhookPayload;

  private async processPaymentStatusChange(data: PaymentStatusUpdatePayload) {
    if (data.currentStatus === data.newStatus) return;

    await WebhookRepository.updatePaymentStatus(
      data.gatewayOrderId,
      data.gatewayPaymentId,
      data.newStatus,
    );

    await WebhookRepository.logPaymentEvent({
      paymentId: data.paymentId,
      fromStatus: data.currentStatus,
      toStatus: data.newStatus,
      trigger: PAYMENT.TRIGGERS.WEBHOOK_RECEIVED,
      payload: data.normalizedEventObject,
    });

    if (
      data.newStatus === PAYMENT.STATUS.SUCCESS ||
      data.newStatus === PAYMENT.STATUS.FAILED
    ) {
      await PaymentEventBus.emit({
        orderId: data.currentOrder.orderId,
        status: data.newStatus,
        gateway: data.gatewayName as PaymentGatewayName,
        amount: data.currentOrder.amount,
        method: data.currentOrder.method as PaymentMethod,
        gatewayPaymentId: data.gatewayPaymentId,
        paymentId: data.paymentId,
      });
    }
  }

  public async execute(
    body: unknown,
    headers: Record<string, any>,
  ): Promise<void> {
    const isValidSignature = this.verifySignature(body, headers);
    if (!isValidSignature) {
      throw new AppError(
        "Invalid webhook signature",
        400,
        ERRORCODES.INVALID_WEBHOOK_SIGNATURE,
      );
    }

    const event = this.parseEvent(body, headers);

    const isDuplicate = await WebhookRepository.recordEvent(
      this.gateway,
      event.eventId,
      event.eventType,
      event.rawPayload,
    );
    if (isDuplicate) return;

    const order = await WebhookRepository.findOrderByGatewayOrderId(
      event.gatewayOrderId,
    );
    if (!order) {
      logger.warn(
        `No payment found for gatewayOrderId: ${event.gatewayOrderId}`,
      );

      return;
    }

    if (event.newStatus) {
      await this.processPaymentStatusChange({
        newStatus: event.newStatus,
        currentStatus: order.status as PaymentStatus,
        currentOrder: order,
        gatewayOrderId: event.gatewayOrderId,
        gatewayPaymentId: event.gatewayPaymentId,
        paymentId: order.id,
        gatewayName: this.gateway,
        normalizedEventObject: {
          eventId: event.eventId,
          eventType: event.eventType,
          gatewayOrderId: event.gatewayOrderId,
          gatewayPaymentId: event.gatewayPaymentId,
        },
      });
    }
    await WebhookRepository.markProcessed(event.eventId);
  }
}

export class RazorpayWebhookProcessor extends BaseWebhookProcessor {
  protected readonly gateway = PAYMENT.GATEWAYS.RAZORPAY;

  protected verifySignature(
    body: unknown,
    headers: Record<string, any>,
  ): boolean {
    const signature = headers["x-razorpay-signature"] as string;
    return GatewayFactory.getGateway(PAYMENT.GATEWAYS.RAZORPAY).verifyWebhook(
      body,
      signature,
    );
  }

  protected parseEvent(
    body: unknown,
    _headers: Record<string, any>,
  ): ParsedWebhookPayload {
    const payload = JSON.parse(body ? body.toString() : "{}");
    const payment = payload.payload.payment.entity;
    const statusMap: Record<string, PaymentStatus> = {
      "payment.authorized": PAYMENT.STATUS.PROCESSING,
      "payment.captured": PAYMENT.STATUS.SUCCESS,
      "payment.failed": PAYMENT.STATUS.FAILED,
    };

    return {
      eventId: payment.id,
      eventType: payload.event,
      gatewayOrderId: payment.order_id,
      gatewayPaymentId: payment.id,
      newStatus: statusMap[payload.event] || null,
      rawPayload: payload,
    };
  }
}

export class CashfreeWebhookProcessor extends BaseWebhookProcessor {
  protected readonly gateway = PAYMENT.GATEWAYS.CASHFREE;

  protected verifySignature(
    body: unknown,
    headers: Record<string, any>,
  ): boolean {
    const signature = headers["x-webhook-signature"] as string;
    const timestamp = headers["x-webhook-timestamp"] as string;
    return GatewayFactory.getGateway(PAYMENT.GATEWAYS.CASHFREE).verifyWebhook(
      body,
      signature,
      timestamp,
    );
  }

  protected parseEvent(
    body: unknown,
    headers: Record<string, any>,
  ): ParsedWebhookPayload {
    const payload = JSON.parse(body ? body.toString() : "{}");
    const order = payload.data.order;
    const payment = payload.data.payment;
    const timestamp = headers["x-webhook-timestamp"] as string;
    const statusMap: Record<string, PaymentStatus> = {
      PAYMENT_SUCCESS_WEBHOOK: PAYMENT.STATUS.SUCCESS,
      PAYMENT_FAILED_WEBHOOK: PAYMENT.STATUS.FAILED,
      PAYMENT_USER_DROPPED_WEBHOOK: PAYMENT.STATUS.FAILED,
    };

    return {
      eventId: `${timestamp}_${payment.cf_payment_id}_${payload.type}`,
      eventType: payload.type,
      gatewayOrderId: order.order_id,
      gatewayPaymentId: String(payment.cf_payment_id),
      newStatus: statusMap[payload.type] || null,
      rawPayload: payload,
    };
  }
}

export class WebhookProcessorFactory {
  private static processors: Record<string, BaseWebhookProcessor> = {
    [PAYMENT.GATEWAYS.RAZORPAY]: new RazorpayWebhookProcessor(),
    [PAYMENT.GATEWAYS.CASHFREE]: new CashfreeWebhookProcessor(),
  };

  public static getProcessor(
    gateway: PaymentGatewayName,
  ): BaseWebhookProcessor {
    const processor = this.processors[gateway];

    if (!processor) {
      throw new AppError(
        `Unknown gateway: ${gateway}`,
        400,
        ERRORCODES.INVALID_GATEWAY,
      );
    }

    return processor;
  }
}
