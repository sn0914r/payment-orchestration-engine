import { cashfreeGateway } from "@/modules/gateways/connectors/cashfree.connector";
import { createCashfreeOrder } from "@/modules/gateways/providers/cashfree.provider";
import { cashfree } from "@/clients/cashfree";
import { PAYMENT } from "@/constants";

jest.mock("@/modules/gateways/providers/cashfree.provider");

jest.mock("@/clients/cashfree", () => ({
  cashfree: {
    PGVerifyWebhookSignature: jest.fn(),
    PGFetchOrder: jest.fn(),
  },
}));

jest.mock("crypto", () => ({
  ...jest.requireActual("crypto"),
  randomUUID: jest.fn(() => "test-uuid-1234"),
}));

const mockCreateCashfreeOrder = createCashfreeOrder as jest.MockedFunction<
  typeof createCashfreeOrder
>;
const mockCashfree = cashfree as jest.Mocked<typeof cashfree>;

const fakePaymentInput = {
  amount: 500,
  method: "upi",
  orderId: "order-abc",
  customer: {
    id: "cust-001",
    phone: "9999999999",
    email: "test@example.com",
  },
};

describe("initiatePayment", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should send the correct data to Cashfree when creating an order", async () => {
    mockCreateCashfreeOrder.mockResolvedValueOnce({
      gatewayOrderId: "cf-order-123",
      paymentSession: "session-token-xyz",
    });

    await cashfreeGateway.initiatePayment(fakePaymentInput);

    expect(mockCreateCashfreeOrder).toHaveBeenCalledWith({
      order_id: "test-uuid-1234",
      order_amount: 500,
      customer_details: {
        customer_id: "cust-001",
        customer_phone: "9999999999",
        customer_email: "test@example.com",
      },
      order_meta: {
        payment_methods: "upi",
      },
    });
  });

  it("should return gatewayOrderId and paymentLink from the response", async () => {
    mockCreateCashfreeOrder.mockResolvedValueOnce({
      gatewayOrderId: "cf-order-123",
      paymentSession: "session-token-xyz",
    });

    const result = await cashfreeGateway.initiatePayment(fakePaymentInput);

    expect(result).toEqual({
      gatewayOrderId: "cf-order-123",
      paymentLink: "session-token-xyz",
    });
  });

  it("should call randomUUID once per payment (to generate a unique order ID)", async () => {
    const { randomUUID } = require("crypto");

    mockCreateCashfreeOrder.mockResolvedValue({
      gatewayOrderId: "cf-order-x",
      paymentSession: "session-x",
    });

    await cashfreeGateway.initiatePayment(fakePaymentInput);
    await cashfreeGateway.initiatePayment(fakePaymentInput);

    expect(randomUUID).toHaveBeenCalledTimes(2);
  });

  it("should throw an error if Cashfree API fails", async () => {
    mockCreateCashfreeOrder.mockRejectedValueOnce(
      new Error("Cashfree API unavailable"),
    );

    await expect(
      cashfreeGateway.initiatePayment(fakePaymentInput),
    ).rejects.toThrow("Cashfree API unavailable");
  });

  it("should work even when customer email is not provided", async () => {
    const inputWithoutEmail = {
      ...fakePaymentInput,
      customer: { id: "cust-002", phone: "8888888888" },
    };

    mockCreateCashfreeOrder.mockResolvedValueOnce({
      gatewayOrderId: "cf-order-456",
      paymentSession: "session-456",
    });

    const result = await cashfreeGateway.initiatePayment(inputWithoutEmail);

    expect(result.gatewayOrderId).toBe("cf-order-456");
    expect(mockCreateCashfreeOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_details: expect.objectContaining({
          customer_id: "cust-002",
          customer_phone: "8888888888",
          customer_email: undefined,
        }),
        order_meta: {
          payment_methods: "upi",
        },
      }),
    );
  });
});

describe("verifyWebhook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return true when the webhook signature is valid", () => {
    mockCashfree.PGVerifyWebhookSignature.mockReturnValue({} as any);

    const result = cashfreeGateway.verifyWebhook(
      '{"event":"payment_success"}',
      "valid-signature",
      "1700000000",
    );

    expect(result).toBe(true);
  });

  it("should pass signature, payload and timestamp to the SDK in the right order", () => {
    mockCashfree.PGVerifyWebhookSignature.mockReturnValue({} as any);

    cashfreeGateway.verifyWebhook("raw-payload", "sig-abc", "ts-123");

    expect(mockCashfree.PGVerifyWebhookSignature).toHaveBeenCalledWith(
      "sig-abc",
      "raw-payload",
      "ts-123",
    );
  });

  it("should return false when the SDK throws (invalid/tampered signature)", () => {
    mockCashfree.PGVerifyWebhookSignature.mockImplementation((() => {
      throw new Error("Invalid signature");
    }) as any);

    const result = cashfreeGateway.verifyWebhook(
      "tampered-payload",
      "bad-signature",
      "1700000000",
    );

    expect(result).toBe(false);
  });

  it("should return false even if something other than an Error is thrown", () => {
    mockCashfree.PGVerifyWebhookSignature.mockImplementation((() => {
      throw "string error";
    }) as any);

    const result = cashfreeGateway.verifyWebhook("payload", "sig", "ts");

    expect(result).toBe(false);
  });
});

describe("getPaymentStatus", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return the order status from Cashfree", async () => {
    mockCashfree.PGFetchOrder.mockResolvedValueOnce({
      data: { order_status: "PAID" },
    } as any);

    const result = await cashfreeGateway.getPaymentStatus("cf-order-789");

    expect(result).toEqual({ status: "PAID" });
  });

  it("should call PGFetchOrder with the correct orderId", async () => {
    mockCashfree.PGFetchOrder.mockResolvedValueOnce({
      data: { order_status: "ACTIVE" },
    } as any);

    await cashfreeGateway.getPaymentStatus("cf-order-abc");

    expect(mockCashfree.PGFetchOrder).toHaveBeenCalledWith("cf-order-abc");
  });

  it("should throw an error if the order is not found", async () => {
    mockCashfree.PGFetchOrder.mockRejectedValueOnce(
      new Error("Order not found"),
    );

    await expect(
      cashfreeGateway.getPaymentStatus("nonexistent-order"),
    ).rejects.toThrow("Order not found");
  });

  it.each([["PAID"], ["ACTIVE"], ["EXPIRED"], ["CANCELLED"]])(
    "should return '%s' status correctly",
    async (orderStatus) => {
      mockCashfree.PGFetchOrder.mockResolvedValueOnce({
        data: { order_status: orderStatus },
      } as any);

      const result = await cashfreeGateway.getPaymentStatus("order-x");

      expect(result.status).toBe(orderStatus);
    },
  );
});

describe("classifyError", () => {
  const USER_ERROR = PAYMENT.ERROR_TYPES.USER_ERROR;
  const GATEWAY_ERROR = PAYMENT.ERROR_TYPES.GATEWAY_ERROR;

  it("should return USER_ERROR for 'invalid card number'", () => {
    expect(
      cashfreeGateway.classifyError({ message: "invalid card number" }),
    ).toBe(USER_ERROR);
  });

  it("should return USER_ERROR for 'payment was cancelled'", () => {
    expect(
      cashfreeGateway.classifyError({ message: "payment was cancelled" }),
    ).toBe(USER_ERROR);
  });

  it("should return USER_ERROR for 'insufficient funds'", () => {
    expect(
      cashfreeGateway.classifyError({ message: "insufficient funds" }),
    ).toBe(USER_ERROR);
  });

  it("should return USER_ERROR for 'wrong OTP'", () => {
    expect(
      cashfreeGateway.classifyError({ message: "wrong OTP entered" }),
    ).toBe(USER_ERROR);
  });

  it("should return USER_ERROR for 'transaction declined'", () => {
    expect(
      cashfreeGateway.classifyError({
        message: "transaction declined by bank",
      }),
    ).toBe(USER_ERROR);
  });

  it("should return GATEWAY_ERROR for 'network timeout'", () => {
    expect(cashfreeGateway.classifyError({ message: "network timeout" })).toBe(
      GATEWAY_ERROR,
    );
  });

  it("should return GATEWAY_ERROR for 'internal server error'", () => {
    expect(
      cashfreeGateway.classifyError({ message: "internal server error" }),
    ).toBe(GATEWAY_ERROR);
  });

  it("should return GATEWAY_ERROR for 'gateway unreachable'", () => {
    expect(
      cashfreeGateway.classifyError({ message: "gateway unreachable" }),
    ).toBe(GATEWAY_ERROR);
  });

  it("should return GATEWAY_ERROR when the error message is empty", () => {
    expect(cashfreeGateway.classifyError({ message: "" })).toBe(GATEWAY_ERROR);
  });

  it("should return GATEWAY_ERROR when err is null", () => {
    expect(cashfreeGateway.classifyError(null)).toBe(GATEWAY_ERROR);
  });

  it("should return GATEWAY_ERROR when err is undefined", () => {
    expect(cashfreeGateway.classifyError(undefined)).toBe(GATEWAY_ERROR);
  });

  it("should return GATEWAY_ERROR when err has no message property", () => {
    expect(cashfreeGateway.classifyError({})).toBe(GATEWAY_ERROR);
  });

  it("keyword matching should be case-insensitive", () => {
    expect(cashfreeGateway.classifyError({ message: "INVALID card" })).toBe(
      USER_ERROR,
    );
    expect(
      cashfreeGateway.classifyError({ message: "Payment CANCELLED" }),
    ).toBe(USER_ERROR);
    expect(
      cashfreeGateway.classifyError({ message: "Insufficient Funds" }),
    ).toBe(USER_ERROR);
  });
});
