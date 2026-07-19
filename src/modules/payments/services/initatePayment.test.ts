import { initiatePayment } from "./initiatePayment";
import {
  findOrderByOrderId,
  insertPaymentRecord,
  logPaymentEvent,
  logGatewayAttempt,
  markPaymentRecordFailed,
  updatePaymentRecordGatewayDetails,
} from "../payment.repository";
import { getGateway } from "@/modules/gateways/gateway.factory";
import {
  getRoutingGateway,
  getFallbackGateway,
} from "@/modules/routing/routing.service";
import { AppError } from "@/errors/AppError";
import { ERRORCODES, PAYMENT } from "@/constants";

jest.mock("../payment.repository");
jest.mock("@/modules/gateways/gateway.factory");
jest.mock("@/modules/routing/routing.service");

const mockFindOrderByOrderId = findOrderByOrderId as jest.MockedFunction<
  typeof findOrderByOrderId
>;
const mockInsertPaymentRecord = insertPaymentRecord as jest.MockedFunction<
  typeof insertPaymentRecord
>;
const mockLogPaymentEvent = logPaymentEvent as jest.MockedFunction<
  typeof logPaymentEvent
>;
const mockLogGatewayAttempt = logGatewayAttempt as jest.MockedFunction<
  typeof logGatewayAttempt
>;
const mockMarkPaymentRecordFailed =
  markPaymentRecordFailed as jest.MockedFunction<
    typeof markPaymentRecordFailed
  >;
const mockUpdatePaymentRecordGatewayDetails =
  updatePaymentRecordGatewayDetails as jest.MockedFunction<
    typeof updatePaymentRecordGatewayDetails
  >;
const mockGetGateway = getGateway as jest.MockedFunction<typeof getGateway>;
const mockGetRoutingGateway = getRoutingGateway as jest.MockedFunction<
  typeof getRoutingGateway
>;
const mockGetFallbackGateway = getFallbackGateway as jest.MockedFunction<
  typeof getFallbackGateway
>;

const fakeInput = {
  amountInRupees: 500,
  method: "upi" as any,
  orderId: "order-001",
  idempotencyKey: "idem-key-001",
  customer: { id: "cust-001", phone: "9999999999", email: "test@test.com" },
};

const fakePaymentRecord = {
  id: "pay-001",
  orderId: "order-001",
  status: "initiated",
  gateway: null,
  gatewayOrderId: null,
  amount: 50000,
  method: "upi",
  idempotencyKey: "idem-key-001",
  createdAt: new Date(),
  updatedAt: new Date(),
} as any;

const fakeCashfreeGateway = {
  initiatePayment: jest.fn(),
  verifyWebhook: jest.fn(),
  getPaymentStatus: jest.fn(),
  classifyError: jest.fn(),
};

const fakeRazorpayGateway = {
  initiatePayment: jest.fn(),
  verifyWebhook: jest.fn(),
  getPaymentStatus: jest.fn(),
  classifyError: jest.fn(),
};

describe("initiatePayment", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockFindOrderByOrderId.mockResolvedValue(undefined as any);
    mockInsertPaymentRecord.mockResolvedValue(fakePaymentRecord);
    mockLogPaymentEvent.mockResolvedValue(undefined as any);
    mockLogGatewayAttempt.mockResolvedValue(undefined as any);
    mockMarkPaymentRecordFailed.mockResolvedValue(undefined as any);
    mockUpdatePaymentRecordGatewayDetails.mockResolvedValue(undefined as any);

    mockGetRoutingGateway.mockReturnValue(PAYMENT.GATEWAYS.CASHFREE as any);
    mockGetFallbackGateway.mockReturnValue(null);
    mockGetGateway.mockReturnValue(fakeCashfreeGateway as any);

    fakeCashfreeGateway.initiatePayment.mockResolvedValue({
      gatewayOrderId: "cf-order-001",
      paymentLink: "https://pay.cashfree.com/session-abc",
    });
  });

  it("should return payment details on successful Cashfree payment", async () => {
    const result = await initiatePayment(fakeInput);

    expect(result).toEqual({
      paymentId: "pay-001",
      orderId: "cf-order-001",
      gateway: PAYMENT.GATEWAYS.CASHFREE,
      paymentLink: "https://pay.cashfree.com/session-abc",
      paymentMethod: "upi",
      keyId: undefined,
    });
  });

  it("should return keyId when Razorpay is the gateway", async () => {
    mockGetRoutingGateway.mockReturnValue(PAYMENT.GATEWAYS.RAZORPAY as any);
    mockGetGateway.mockReturnValue(fakeRazorpayGateway as any);
    fakeRazorpayGateway.initiatePayment.mockResolvedValue({
      gatewayOrderId: "rzp-order-001",
      keyId: "rzp_test_key",
    });

    const result = await initiatePayment(fakeInput);

    expect(result.keyId).toBe("rzp_test_key");
    expect(result.gateway).toBe(PAYMENT.GATEWAYS.RAZORPAY);
  });

  it("should throw AppError if the order is already paid", async () => {
    const paidOrder = { ...fakePaymentRecord, status: PAYMENT.STATUS.SUCCESS };
    mockFindOrderByOrderId.mockResolvedValue(paidOrder);

    await expect(initiatePayment(fakeInput)).rejects.toThrow(AppError);
  });

  it("should throw with ORDER_ALREADY_PAID error code if order is already paid", async () => {
    const paidOrder = { ...fakePaymentRecord, status: PAYMENT.STATUS.SUCCESS };
    mockFindOrderByOrderId.mockResolvedValue(paidOrder);

    try {
      await initiatePayment(fakeInput);
    } catch (err) {
      expect((err as AppError).errorCode).toBe(ERRORCODES.ORDER_ALREADY_PAID);
    }
  });

  it("should throw AppError with PAYMENT_INITIATION_FAILED if DB insert returns nothing", async () => {
    mockInsertPaymentRecord.mockResolvedValue(undefined as any);

    await expect(initiatePayment(fakeInput)).rejects.toThrow(AppError);

    try {
      await initiatePayment(fakeInput);
    } catch (err) {
      expect((err as AppError).errorCode).toBe(
        ERRORCODES.PAYMENT_INITIATION_FAILED,
      );
    }
  });

  it("should throw USER_PAYMENT_FAILED AppError on user error from gateway", async () => {
    fakeCashfreeGateway.initiatePayment.mockRejectedValue(
      new Error("invalid card"),
    );

    fakeCashfreeGateway.classifyError.mockReturnValue(
      PAYMENT.ERROR_TYPES.USER_ERROR,
    );

    await expect(initiatePayment(fakeInput)).rejects.toThrow(AppError);

    try {
      await initiatePayment(fakeInput);
    } catch (err) {
      expect((err as AppError).errorCode).toBe(ERRORCODES.USER_PAYMENT_FAILED);
      expect((err as AppError).statusCode).toBe(400);
    }
  });

  it("should mark the payment as failed on user error", async () => {
    fakeCashfreeGateway.initiatePayment.mockRejectedValue(
      new Error("declined"),
    );
    fakeCashfreeGateway.classifyError.mockReturnValue(
      PAYMENT.ERROR_TYPES.USER_ERROR,
    );

    await expect(initiatePayment(fakeInput)).rejects.toThrow();

    expect(mockMarkPaymentRecordFailed).toHaveBeenCalledWith(
      "pay-001",
      PAYMENT.GATEWAYS.CASHFREE,
    );
  });

  it("should try the fallback gateway when primary gateway fails with a gateway error", async () => {
    fakeCashfreeGateway.initiatePayment.mockRejectedValueOnce(
      new Error("timeout"),
    );
    fakeCashfreeGateway.classifyError.mockReturnValue(
      PAYMENT.ERROR_TYPES.GATEWAY_ERROR,
    );

    mockGetFallbackGateway.mockReturnValue(PAYMENT.GATEWAYS.RAZORPAY as any);

    mockGetGateway.mockImplementation((name: any) => {
      if (name === PAYMENT.GATEWAYS.RAZORPAY) return fakeRazorpayGateway as any;
      return fakeCashfreeGateway as any;
    });

    fakeRazorpayGateway.initiatePayment.mockResolvedValue({
      gatewayOrderId: "rzp-order-001",
      keyId: "rzp_test_key",
    });

    const result = await initiatePayment(fakeInput);

    expect(fakeRazorpayGateway.initiatePayment).toHaveBeenCalledTimes(1);
    expect(result.gateway).toBe(PAYMENT.GATEWAYS.RAZORPAY);
  });

  it("should throw ALL_GATEWAY_FAILED when there is no fallback gateway", async () => {
    fakeCashfreeGateway.initiatePayment.mockRejectedValue(new Error("timeout"));
    fakeCashfreeGateway.classifyError.mockReturnValue(
      PAYMENT.ERROR_TYPES.GATEWAY_ERROR,
    );

    mockGetFallbackGateway.mockReturnValue(null);

    await expect(initiatePayment(fakeInput)).rejects.toThrow(AppError);

    try {
      await initiatePayment(fakeInput);
    } catch (err) {
      expect((err as AppError).errorCode).toBe(ERRORCODES.ALL_GATEWAY_FAILED);
      expect((err as AppError).statusCode).toBe(503);
    }
  });

  it("should mark the payment as failed when all gateways fail", async () => {
    fakeCashfreeGateway.initiatePayment.mockRejectedValue(new Error("timeout"));
    fakeCashfreeGateway.classifyError.mockReturnValue(
      PAYMENT.ERROR_TYPES.GATEWAY_ERROR,
    );
    mockGetFallbackGateway.mockReturnValue(null);

    await expect(initiatePayment(fakeInput)).rejects.toThrow();

    expect(mockMarkPaymentRecordFailed).toHaveBeenCalledWith(
      "pay-001",
      PAYMENT.GATEWAYS.CASHFREE,
    );
  });

  it("should call logPaymentEvent at least once during a successful payment", async () => {
    await initiatePayment(fakeInput);

    expect(mockLogPaymentEvent).toHaveBeenCalled();
  });

  it("should call logGatewayAttempt on successful gateway call", async () => {
    await initiatePayment(fakeInput);

    expect(mockLogGatewayAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: "pay-001",
        gateway: PAYMENT.GATEWAYS.CASHFREE,
        status: PAYMENT.GATEWAY_ATTEMPTS_STATUS.SUCCESS,
      }),
    );
  });

  it("should call updatePaymentRecordGatewayDetails on success", async () => {
    await initiatePayment(fakeInput);

    expect(mockUpdatePaymentRecordGatewayDetails).toHaveBeenCalledWith(
      "pay-001",
      PAYMENT.GATEWAYS.CASHFREE,
      "cf-order-001",
      PAYMENT.STATUS.INITIATED,
    );
  });
});
