import type { Request, Response } from "express";
import type {
  ApiResponse,
  PaymentMethod,
  InitiatePaymentRequestBody,
  InitiatePaymentResponseBody,
} from "./payment.types";
import { PaymentService } from "./payment.service";

export class PaymentController {
  public static async initiate(
    req: Request<
      Record<string, never>,
      Record<string, never>,
      InitiatePaymentRequestBody
    >,
    res: Response<
      ApiResponse<InitiatePaymentResponseBody | Record<string, never>>
    >,
  ): Promise<void> {
    const { amount, method, orderId, customer } = req.body;
    const idempotencyKey = req.headers["idempotency-key"] as string;

    const result = await PaymentService.initiate({
      amountInRupees: amount,
      method: method as PaymentMethod,
      orderId,
      idempotencyKey,
      customer,
    });

    res.json({
      success: true,
      message: "Payment order created",
      data: {
        paymentId: result.paymentId,
        orderId: result.orderId,
        gateway: result.gateway,
        paymentMethod: result.paymentMethod,
        ...(result.paymentLink && { paymentLink: result.paymentLink }),
        ...(result.keyId && { keyId: result.keyId }),
      },
    });
  }

  public static async getById(
    req: Request<{ id: string }>,
    res: Response,
  ): Promise<void> {
    const paymentId = req.params.id as string;
    const record = await PaymentService.getById(paymentId);
    res.status(200).json({
      success: true,
      message: "Payment details retrieved",
      data: record,
    });
  }
}
