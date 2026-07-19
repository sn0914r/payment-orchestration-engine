import { initiatePayment } from "./services/initiatePayment";
import type { ApiResponse, PaymentMethod } from "@/types";
import type {
  InitiatePaymentRequestBodyShape,
  InitiatePaymentResponseShape,
} from "./payment.types";
import { getPaymentRecord } from "./services/getPaymentRecord";
import { PAYMENT } from "@/constants";
import type { Request, Response } from "express";

export const initiatePaymentController = async (
  req: Request<{}, {}, InitiatePaymentRequestBodyShape>,
  res: Response<ApiResponse<InitiatePaymentResponseShape | {}>>,
) => {
  const { amount, method, orderId, customer } = req.body;

  const idempotencyKey = req.headers["idempotency-key"] as string;

  const result = await initiatePayment({
    amountInRupees: amount,
    method: method as PaymentMethod,
    orderId,
    idempotencyKey,
    customer,
  });

  if (result.gateway === PAYMENT.GATEWAYS.CASHFREE) {
    return res.json({
      success: true,
      message: "Payment order created",
      data: {
        paymentId: result.paymentId,
        orderId: result.orderId,
        gateway: result.gateway,
        paymentLink: result.paymentLink,
        paymentMethod: result.paymentMethod,
      },
    });
  }

  if (result.gateway === PAYMENT.GATEWAYS.RAZORPAY) {
    return res.json({
      success: true,
      message: "Payment order created",
      data: {
        paymentId: result.paymentId,
        orderId: result.orderId,
        gateway: result.gateway,
        keyId: result.keyId,
        paymentMethod: result.paymentMethod,
      },
    });
  }
};

export const getPaymentRecordController = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  const paymentId = req.params.id as string;

  const record = await getPaymentRecord(paymentId);
  res.status(200).json({
    success: true,
    message: "Payment details retrieved",
    data: record,
  });
};
