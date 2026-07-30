import {
  assertValidWebhookSignature,
  processPaymentStatusChange,
} from "@/modules/webhooks/webhook.helpers";
import { AppError } from "@/errors/AppError";
import { ERRORCODES, PAYMENT } from "@/constants";
import { updatePaymentStatusByGatewayOrderId } from "@/modules/webhooks/webhook.repository";
import { logPaymentEvent } from "@/modules/payments/payment.repository";
import { notifyClient } from "@/modules/webhooks/notifyClient";
import type { ProcessPaymentProps } from "@/modules/webhooks/webhook.types";
import { PaymentsTable } from "@/db/schema/payment.schema";
import { PaymentStatus } from "@/types";

jest.mock("@/configs", () => ({
  configs: {},
}));
jest.mock("@/clients/pgsql");
jest.mock("@/modules/webhooks/webhook.repository");
jest.mock("@/modules/payments/payment.repository");
jest.mock("@/modules/webhooks/notifyClient");

describe("assertValidWebhookSignature", () => {
  it("should do nothing when the signature is valid (true)", () => {
    expect(() => assertValidWebhookSignature(true)).not.toThrow();
  });

  it("should throw an AppError when the signature is invalid (false)", () => {
    expect(() => assertValidWebhookSignature(false)).toThrow(AppError);
  });

  it("should throw with message 'Invalid webhook signature'", () => {
    expect(() => assertValidWebhookSignature(false)).toThrow(
      "Invalid webhook signature",
    );
  });

  it("should throw with HTTP status code 400", () => {
    try {
      assertValidWebhookSignature(false);
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).statusCode).toBe(400);
    }
  });

  it("should throw with the correct error code INVALID_WEBHOOK_SIGNATURE", () => {
    try {
      assertValidWebhookSignature(false);
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).errorCode).toBe(
        ERRORCODES.INVALID_WEBHOOK_SIGNATURE,
      );
    }
  });

  it("should throw an AppError (not a plain Error)", () => {
    let caughtError: unknown;

    try {
      assertValidWebhookSignature(false);
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeInstanceOf(AppError);
    expect(caughtError).toBeInstanceOf(Error);
  });
});

describe("processPaymentStatusChange", () => {
  const defaultProps: ProcessPaymentProps = {
    newStatus: PAYMENT.STATUS.SUCCESS as PaymentStatus,
    currentStatus: PAYMENT.STATUS.INITIATED as PaymentStatus,
    currentOrder: {
      orderId: "order_123",
      amount: 1000,
      method: PAYMENT.METHOD.UPI,
    } as typeof PaymentsTable.$inferSelect,
    gatewayOrderId: "go_123",
    gatewayPaymentId: "gp_123",
    paymentId: "p_123",
    gatewayName: PAYMENT.GATEWAYS.RAZORPAY,
    normalizedEventObject: {
      eventId: "e_1",
      eventType: "event",
      gatewayOrderId: "go_123",
      gatewayPaymentId: "gp_123",
    },
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return early if currentStatus is equal to newStatus", async () => {
    await processPaymentStatusChange({
      ...defaultProps,
      currentStatus: PAYMENT.STATUS.SUCCESS as PaymentStatus,
      newStatus: PAYMENT.STATUS.SUCCESS as PaymentStatus,
    });

    expect(updatePaymentStatusByGatewayOrderId).not.toHaveBeenCalled();
    expect(logPaymentEvent).not.toHaveBeenCalled();
    expect(notifyClient).not.toHaveBeenCalled();
  });

  it("should update status and log event but not notify client for non-terminal statuses", async () => {
    await processPaymentStatusChange({
      ...defaultProps,
      newStatus: PAYMENT.STATUS.PROCESSING as PaymentStatus,
    });

    expect(updatePaymentStatusByGatewayOrderId).toHaveBeenCalledWith(
      "go_123",
      "gp_123",
      PAYMENT.STATUS.PROCESSING
    );
    expect(logPaymentEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: "p_123",
        toStatus: PAYMENT.STATUS.PROCESSING,
        trigger: PAYMENT.TRIGGERS.WEBHOOK_RECEIVED,
      })
    );
    expect(notifyClient).not.toHaveBeenCalled();
  });

  it("should update status, log event, and notify client for SUCCESS status", async () => {
    await processPaymentStatusChange({
      ...defaultProps,
      newStatus: PAYMENT.STATUS.SUCCESS as PaymentStatus,
    });

    expect(updatePaymentStatusByGatewayOrderId).toHaveBeenCalledWith(
      "go_123",
      "gp_123",
      PAYMENT.STATUS.SUCCESS
    );
    expect(logPaymentEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: "p_123",
        toStatus: PAYMENT.STATUS.SUCCESS,
        trigger: PAYMENT.TRIGGERS.WEBHOOK_RECEIVED,
      })
    );
    expect(notifyClient).toHaveBeenCalledWith({
      orderId: "order_123",
      status: PAYMENT.STATUS.SUCCESS,
      gateway: PAYMENT.GATEWAYS.RAZORPAY,
      amount: 1000,
      method: PAYMENT.METHOD.UPI,
      gatewayPaymentId: "gp_123",
      paymentId: "p_123",
    });
  });

  it("should update status, log event, and notify client for FAILED status", async () => {
    await processPaymentStatusChange({
      ...defaultProps,
      newStatus: PAYMENT.STATUS.FAILED as PaymentStatus,
    });

    expect(updatePaymentStatusByGatewayOrderId).toHaveBeenCalledWith(
      "go_123",
      "gp_123",
      PAYMENT.STATUS.FAILED
    );
    expect(logPaymentEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: "p_123",
        toStatus: PAYMENT.STATUS.FAILED,
        trigger: PAYMENT.TRIGGERS.WEBHOOK_RECEIVED,
      })
    );
    expect(notifyClient).toHaveBeenCalledWith({
      orderId: "order_123",
      status: PAYMENT.STATUS.FAILED,
      gateway: PAYMENT.GATEWAYS.RAZORPAY,
      amount: 1000,
      method: PAYMENT.METHOD.UPI,
      gatewayPaymentId: "gp_123",
      paymentId: "p_123",
    });
  });
});
