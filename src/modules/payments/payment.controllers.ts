import type { Request, Response } from "express";
import { initiatePayment } from "./services/initiatePayment";
import type { ApiResponse } from "@/types";
import type {
  InitiatePaymentReqBody,
  InitiatePaymentResData,
} from "./payment.types";
import { getPaymentRecord } from "./services/getPaymentRecord";
import { logger } from "@/utils/logger";

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

export const getPaymentRecordController = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  const paymentId = req.params.id as string;
  logger.info(`Payment Id is ${paymentId}`);

  const record = await getPaymentRecord(paymentId);

  res.status(200).json({
    success: true,
    message: "Payment details retrieved",
    data: record,
  });
};
