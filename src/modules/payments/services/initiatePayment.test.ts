jest.mock("@/clients/pgsql", () => {
  const dbMock = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    where: jest.fn(),
    values: jest.fn(),
  };

  return { db: dbMock };
});

jest.mock("@/providers/razorpay", () => ({
  createRazorpayOrder: jest.fn().mockResolvedValue("order_TB6GD0MXWou2CT"),
}));

import { db } from "@/clients/pgsql";
import type { PaymentRecord } from "../payment.types";
import { initiatePayment } from "./initiatePayment";
import { AppError } from "@/errors/AppError";

describe("initiatePayment Service Fn", () => {
  test("should throw an error if order status is SUCCESS already", async () => {
    ((db as any).where as jest.Mock).mockResolvedValueOnce([
      {
        id: "607b1e77-ac2b-4a22-b2d5-b48c7b8260cf",
        idempotencyKey: "620eab0a-c236-4466-917e-1cb0cadb4b9e",
        orderId: "TEST_ORDER_822BA240",
        gateway: "razorpay",
        gatewayOrderId: "order_TB6GD0MXWou2CT",
        gatewayPaymentId: "pay_TB6GJ8O9qnimuh",
        status: "success",
        method: "upi",
        amount: 500000,
        currency: "INR",
        createdAt: null,
        updatedAt: null,
      },
    ] as PaymentRecord[]);

    await expect(
      initiatePayment(
        5000,
        "upi",
        "TEST_ORDER_822BA240",
        "620eab0a-c236-4466-917e-1cb0cadb4b9e",
      ),
    ).rejects.toThrow(AppError);
  });

  test("should return gateway order id, gateway, gateway method", async () => {
    ((db as any).where as jest.Mock).mockResolvedValueOnce([]);
    ((db as any).values as jest.Mock).mockResolvedValueOnce([]);

    const result = await initiatePayment(
      5000,
      "upi",
      "TEST_ORDER_822BA240",
      "620eab0a-c236-4466-917e-1cb0cadb4b9e",
    );

    expect(result).toEqual({
      gatewayOrderId: "order_TB6GD0MXWou2CT",
      gateway: "razorpay",
      paymentMethod: "upi",
    });
  });
});
