import { razorpayGateway } from "@/modules/gateways/connectors/razorpay.connector";
import { createRazorpayOrder } from "@/modules/gateways/providers/razorpay.provider";
import { razorpay } from "@/clients/razorpay";
import { PAYMENT } from "@/constants";

jest.mock("@/modules/gateways/providers/razorpay.provider");

jest.mock("@/clients/razorpay", () => ({
  razorpay: {
    orders: {
      fetch: jest.fn(),
    },
  },
}));

jest.mock("razorpay/dist/utils/razorpay-utils", () => ({
  validateWebhookSignature: jest.fn(),
}));

jest.mock("@/configs", () => ({
  configs: {
    RAZORPAY: {
      KEY_ID: "test-key-id",
      WEBHOOK_SECRET: "test-webhook-secret",
    },
  },
}));

import { validateWebhookSignature } from "razorpay/dist/utils/razorpay-utils";

const mockCreateRazorpayOrder = createRazorpayOrder as jest.MockedFunction<
  typeof createRazorpayOrder
>;

const mockOrdersFetch = razorpay.orders.fetch as jest.MockedFunction<
  (orderId: string) => Promise<any>
>;
const mockValidateWebhookSignature =
  validateWebhookSignature as jest.MockedFunction<
    typeof validateWebhookSignature
  >;

const fakePaymentInput = {
  amount: 500,
  method: "upi",
  orderId: "order-abc",
  customer: {
    id: "cust-001",
    phone: "9999999999",
  },
};

describe("initiatePayment", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return gatewayOrderId and keyId from the provider response", async () => {
    mockCreateRazorpayOrder.mockResolvedValueOnce("rzp-order-123");

    const result = await razorpayGateway.initiatePayment(fakePaymentInput);

    expect(result).toEqual({
      gatewayOrderId: "rzp-order-123",
      keyId: "test-key-id",
    });
  });

  it("should call createRazorpayOrder with correct amount, currency and orderId", async () => {
    mockCreateRazorpayOrder.mockResolvedValueOnce("rzp-order-123");

    await razorpayGateway.initiatePayment(fakePaymentInput);

    expect(mockCreateRazorpayOrder).toHaveBeenCalledWith(
      500,
      "INR",
      "order-abc",
    );
  });

  it("should use a custom currency when provided", async () => {
    mockCreateRazorpayOrder.mockResolvedValueOnce("rzp-order-usd");

    await razorpayGateway.initiatePayment({
      ...fakePaymentInput,
      currency: "USD",
    });

    expect(mockCreateRazorpayOrder).toHaveBeenCalledWith(
      500,
      "USD",
      "order-abc",
    );
  });

  it("should throw an error if the Razorpay API fails", async () => {
    mockCreateRazorpayOrder.mockRejectedValueOnce(
      new Error("Razorpay API down"),
    );

    await expect(
      razorpayGateway.initiatePayment(fakePaymentInput),
    ).rejects.toThrow("Razorpay API down");
  });
});

describe("verifyWebhook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return true when the signature is valid", () => {
    mockValidateWebhookSignature.mockReturnValueOnce(true);

    const result = razorpayGateway.verifyWebhook(
      { event: "payment.captured" },
      "valid-signature",
    );

    expect(result).toBe(true);
  });

  it("should return false when the signature is invalid", () => {
    mockValidateWebhookSignature.mockReturnValueOnce(false);

    const result = razorpayGateway.verifyWebhook(
      { event: "payment.captured" },
      "bad-signature",
    );

    expect(result).toBe(false);
  });

  it("should pass the JSON-stringified payload to the validator", () => {
    mockValidateWebhookSignature.mockReturnValueOnce(true);

    const payload = { event: "payment.captured", id: "pay_001" };
    razorpayGateway.verifyWebhook(payload, "some-signature");

    expect(mockValidateWebhookSignature).toHaveBeenCalledWith(
      JSON.stringify(payload),
      "some-signature",
      "test-webhook-secret",
    );
  });
});

describe("getPaymentStatus", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return the order status from Razorpay", async () => {
    mockOrdersFetch.mockResolvedValueOnce({
      status: "paid",
    } as any);

    const result = await razorpayGateway.getPaymentStatus("rzp-order-789");

    expect(result).toEqual({ status: "paid" });
  });

  it("should call orders.fetch with the correct orderId", async () => {
    mockOrdersFetch.mockResolvedValueOnce({ status: "created" } as any);

    await razorpayGateway.getPaymentStatus("rzp-order-abc");

    expect(mockOrdersFetch).toHaveBeenCalledWith("rzp-order-abc");
  });

  it("should throw an error if Razorpay fails to fetch the order", async () => {
    mockOrdersFetch.mockRejectedValueOnce(new Error("Order not found"));

    await expect(
      razorpayGateway.getPaymentStatus("nonexistent-order"),
    ).rejects.toThrow("Order not found");
  });

  it.each([["paid"], ["created"], ["attempted"]])(
    "should return '%s' status correctly",
    async (status) => {
      mockOrdersFetch.mockResolvedValueOnce({ status } as any);

      const result = await razorpayGateway.getPaymentStatus("order-x");

      expect(result.status).toBe(status);
    },
  );
});

describe("classifyError", () => {
  const USER_ERROR = PAYMENT.ERROR_TYPES.USER_ERROR;
  const GATEWAY_ERROR = PAYMENT.ERROR_TYPES.GATEWAY_ERROR;

  it("should return USER_ERROR when error source is 'customer'", () => {
    const err = { error: { source: "customer" } };
    expect(razorpayGateway.classifyError(err)).toBe(USER_ERROR);
  });

  it("should return USER_ERROR when error source is 'business'", () => {
    const err = { error: { source: "business" } };
    expect(razorpayGateway.classifyError(err)).toBe(USER_ERROR);
  });

  it("should return GATEWAY_ERROR when error source is 'gateway'", () => {
    const err = { error: { source: "gateway" } };
    expect(razorpayGateway.classifyError(err)).toBe(GATEWAY_ERROR);
  });

  it("should return GATEWAY_ERROR when error source is 'issuer_bank'", () => {
    const err = { error: { source: "issuer_bank" } };
    expect(razorpayGateway.classifyError(err)).toBe(GATEWAY_ERROR);
  });

  it("should return GATEWAY_ERROR when err is null", () => {
    expect(razorpayGateway.classifyError(null)).toBe(GATEWAY_ERROR);
  });

  it("should return GATEWAY_ERROR when err is undefined", () => {
    expect(razorpayGateway.classifyError(undefined)).toBe(GATEWAY_ERROR);
  });

  it("should return GATEWAY_ERROR when err has no error field", () => {
    expect(razorpayGateway.classifyError({})).toBe(GATEWAY_ERROR);
  });

  it("should return GATEWAY_ERROR when err.error has no source field", () => {
    expect(razorpayGateway.classifyError({ error: {} })).toBe(GATEWAY_ERROR);
  });
});
