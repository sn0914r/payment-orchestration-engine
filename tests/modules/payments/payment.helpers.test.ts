import {
  assertOrderNotAlreadyPaid,
  assertPaymentRecordCreated,
  transformPaymentRecord,
} from "@/modules/payments/payment.helpers";
import { AppError } from "@/errors/AppError";
import { ERRORCODES, PAYMENT } from "@/constants";

const fakePaymentRecord = {
  id: "pay-001",
  orderId: "order-001",
  status: "initiated",
  gateway: "cashfree",
  gatewayOrderId: "cf-order-001",
  gatewayPaymentId: null,
  amount: 50000,
  method: "upi",
  idempotencyKey: "idem-key-001",
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
} as any;

describe("assertOrderNotAlreadyPaid", () => {
  it("should do nothing when there is no existing order (undefined)", () => {
    expect(() => assertOrderNotAlreadyPaid(undefined)).not.toThrow();
  });

  it("should do nothing when the order status is 'initiated'", () => {
    const order = { ...fakePaymentRecord, status: PAYMENT.STATUS.INITIATED };
    expect(() => assertOrderNotAlreadyPaid(order)).not.toThrow();
  });

  it("should do nothing when the order status is 'failed'", () => {
    const order = { ...fakePaymentRecord, status: PAYMENT.STATUS.FAILED };
    expect(() => assertOrderNotAlreadyPaid(order)).not.toThrow();
  });

  it("should throw an AppError when the order status is 'success'", () => {
    const order = { ...fakePaymentRecord, status: PAYMENT.STATUS.SUCCESS };
    expect(() => assertOrderNotAlreadyPaid(order)).toThrow(AppError);
  });

  it("should throw with message 'Payment has already been completed for this order'", () => {
    const order = { ...fakePaymentRecord, status: PAYMENT.STATUS.SUCCESS };
    expect(() => assertOrderNotAlreadyPaid(order)).toThrow(
      "Payment has already been completed for this order",
    );
  });

  it("should throw with HTTP status 409", () => {
    const order = { ...fakePaymentRecord, status: PAYMENT.STATUS.SUCCESS };
    try {
      assertOrderNotAlreadyPaid(order);
    } catch (err) {
      expect((err as AppError).statusCode).toBe(409);
    }
  });

  it("should throw with error code ORDER_ALREADY_PAID", () => {
    const order = { ...fakePaymentRecord, status: PAYMENT.STATUS.SUCCESS };
    try {
      assertOrderNotAlreadyPaid(order);
    } catch (err) {
      expect((err as AppError).errorCode).toBe(ERRORCODES.ORDER_ALREADY_PAID);
    }
  });
});

describe("assertPaymentRecordCreated", () => {
  it("should do nothing when a payment record exists", () => {
    expect(() => assertPaymentRecordCreated(fakePaymentRecord)).not.toThrow();
  });

  it("should throw an AppError when payment record is undefined", () => {
    expect(() => assertPaymentRecordCreated(undefined)).toThrow(AppError);
  });

  it("should throw with message 'Failed to initiate payment'", () => {
    expect(() => assertPaymentRecordCreated(undefined)).toThrow(
      "Failed to initiate payment",
    );
  });

  it("should throw with HTTP status 500", () => {
    try {
      assertPaymentRecordCreated(undefined);
    } catch (err) {
      expect((err as AppError).statusCode).toBe(500);
    }
  });

  it("should throw with error code PAYMENT_INITIATION_FAILED", () => {
    try {
      assertPaymentRecordCreated(undefined);
    } catch (err) {
      expect((err as AppError).errorCode).toBe(
        ERRORCODES.PAYMENT_INITIATION_FAILED,
      );
    }
  });
});

describe("transformPaymentRecord", () => {
  it("should convert amount from paise to rupees (divide by 100)", () => {
    const result = transformPaymentRecord(fakePaymentRecord);

    expect(result.amount).toBe(500);
  });

  it("should rename 'id' to 'paymentId'", () => {
    const result = transformPaymentRecord(fakePaymentRecord);
    expect(result.paymentId).toBe("pay-001");
  });

  it("should rename 'method' to 'paymentMethod'", () => {
    const result = transformPaymentRecord(fakePaymentRecord);
    expect(result.paymentMethod).toBe("upi");
  });

  it("should include all expected fields in the output", () => {
    const result = transformPaymentRecord(fakePaymentRecord);

    expect(result).toEqual({
      paymentId: "pay-001",
      orderId: "order-001",
      status: "initiated",
      gateway: "cashfree",
      gatewayOrderId: "cf-order-001",
      gatewayPaymentId: null,
      amount: 500,
      paymentMethod: "upi",
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: new Date("2024-01-01T00:00:00Z"),
    });
  });

  it("should not include id or method in the output", () => {
    const result = transformPaymentRecord(fakePaymentRecord) as any;
    expect(result.id).toBeUndefined();
    expect(result.method).toBeUndefined();
  });

  it("should work correctly for amount of 0", () => {
    const record = { ...fakePaymentRecord, amount: 0 };
    const result = transformPaymentRecord(record);
    expect(result.amount).toBe(0);
  });

  it("should work correctly for large amounts", () => {
    const record = { ...fakePaymentRecord, amount: 10_000_000 };
    const result = transformPaymentRecord(record);
    expect(result.amount).toBe(100_000);
  });
});
