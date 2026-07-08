import type { Request, Response } from "express";
import { initiatePayment } from "./services/initiatePayment";
import type { ApiResponse } from "@/types";
import type {
  InitiatePaymentReqBody,
  InitiatePaymentResData,
} from "./payment.types";

export const initiatePaymentController = async (
  req: Request<{}, {}, InitiatePaymentReqBody>,
  res: Response<ApiResponse<InitiatePaymentResData>>,
) => {
  const {
    amount,
    method,
    orderId,
    idempotencyKey,
    currency = "INR",
  } = req.body;

  const { gatewayOrderId, gateway, paymentMethod } = await initiatePayment(
    amount,
    method,
    orderId,
    idempotencyKey,
    currency,
  );

  res.status(200).json({
    success: true,
    message: "Payment order created",
    data: {
      gatewayOrderId,
      gateway,
      method: paymentMethod,
    },
  });
};
