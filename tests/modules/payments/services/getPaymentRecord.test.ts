import { getPaymentRecord } from "@/modules/payments/services/getPaymentRecord";
import { findPaymentByPaymentId } from "@/modules/payments/payment.repository";
import { AppError } from "@/errors/AppError";
import { ERRORCODES } from "@/constants";

jest.mock("@/configs", () => ({
  configs: {
    CASHFREE: { CLIENT_ID: "test_id", CLIENT_SECRET: "test_secret" },
    RAZORPAY: { KEY_ID: "test_key", WEBHOOK_SECRET: "test_secret" },
  },
}));
jest.mock("@/modules/payments/payment.repository");

const mockFindPaymentByPaymentId =
  findPaymentByPaymentId as jest.MockedFunction<typeof findPaymentByPaymentId>;

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

describe("getPaymentRecord", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return the transformed payment record when found", async () => {
    mockFindPaymentByPaymentId.mockResolvedValueOnce(fakePaymentRecord);

    const result = await getPaymentRecord("pay-001");

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

  it("should call findPaymentByPaymentId with the correct paymentId", async () => {
    mockFindPaymentByPaymentId.mockResolvedValueOnce(fakePaymentRecord);

    await getPaymentRecord("pay-001");

    expect(mockFindPaymentByPaymentId).toHaveBeenCalledWith("pay-001");
    expect(mockFindPaymentByPaymentId).toHaveBeenCalledTimes(1);
  });

  it("should throw an AppError when the payment record is not found", async () => {
    mockFindPaymentByPaymentId.mockResolvedValueOnce(undefined as any);

    await expect(getPaymentRecord("nonexistent-id")).rejects.toThrow(AppError);
  });

  it("should throw with message 'Failed to initiate payment' when not found", async () => {
    mockFindPaymentByPaymentId.mockResolvedValueOnce(undefined as any);

    await expect(getPaymentRecord("nonexistent-id")).rejects.toThrow(
      "Failed to initiate payment",
    );
  });

  it("should throw with error code PAYMENT_INITIATION_FAILED when not found", async () => {
    mockFindPaymentByPaymentId.mockResolvedValueOnce(undefined as any);

    try {
      await getPaymentRecord("nonexistent-id");
    } catch (err) {
      expect((err as AppError).errorCode).toBe(
        ERRORCODES.PAYMENT_INITIATION_FAILED,
      );
    }
  });

  it("should propagate errors thrown by findPaymentByPaymentId", async () => {
    mockFindPaymentByPaymentId.mockRejectedValueOnce(
      new Error("Database connection failed"),
    );

    await expect(getPaymentRecord("pay-001")).rejects.toThrow(
      "Database connection failed",
    );
  });

  it("should convert amount from paise to rupees in the returned record", async () => {
    const record = { ...fakePaymentRecord, amount: 100000 };
    mockFindPaymentByPaymentId.mockResolvedValueOnce(record);

    const result = await getPaymentRecord("pay-001");

    expect(result.amount).toBe(1000);
  });
});
