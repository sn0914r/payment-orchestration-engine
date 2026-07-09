jest.mock("@/clients/pgsql", () => {
  const dbMock = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn(),
  };

  return { db: dbMock };
});

import { db } from "@/clients/pgsql";
import { getPaymentRecord } from "./getPaymentRecord";
import { AppError } from "@/errors/AppError";
import type { PaymentRecord } from "../payment.types";

describe("getPaymentRecord Service", () => {
  test("should throw an error if the payment is not found", async () => {
    ((db as any).where as jest.Mock).mockResolvedValueOnce([]);

    const fakePaymentId = "123e4567-e89b-12d3-a456-426614174000";
    await expect(getPaymentRecord(fakePaymentId)).rejects.toThrow(AppError);
  });

  test("should return formatted payment details when payment is found", async () => {
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

    const result = await getPaymentRecord(
      "607b1e77-ac2b-4a22-b2d5-b48c7b8260cf",
    );

    expect(result).toEqual({
      paymentId: "607b1e77-ac2b-4a22-b2d5-b48c7b8260cf",
      orderId: "TEST_ORDER_822BA240",
      status: "success",
      gateway: "razorpay",
      gatewayOrderId: "order_TB6GD0MXWou2CT",
      gatewayPaymentId: "pay_TB6GJ8O9qnimuh",
      amount: 5000,
      method: "upi",
      createdAt: null,
      updatedAt: null,
    });
  });
});
