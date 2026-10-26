import { ERRORCODES } from "@/constants";
import { AppError } from "@/errors/AppError";
import { PaymentRepository } from "../payments/payment.repository";
import { RefundRepository } from "./refund.repository";
import { RefundValidator } from "./refund.validator";
import { RefundExecutor } from "./refund.executor";
import type {
  InitiateRefundInput,
  PaymentGatewayName,
  RefundRecord,
  RefundResult,
  RefundStatus,
} from "./refund.types";

export class RefundService {
  static async initiateRefund(
    input: InitiateRefundInput,
  ): Promise<RefundResult> {
    const { paymentId, amountInRupees, idempotencyKey, reason } = input;
    const requestedPaise = Math.round(amountInRupees * 100);

    const payment = await PaymentRepository.findPaymentById(paymentId);
    RefundValidator.assertPaymentFound(payment);
    await RefundValidator.validateEligibility(payment, requestedPaise);

    const refundRecord = await RefundRepository.createRefundRecord({
      paymentId: payment.id,
      gateway: payment.gateway as PaymentGatewayName,
      amountInPaise: requestedPaise,
      idempotencyKey,
      reason,
    });

    const processedRefund = await RefundExecutor.execute(
      refundRecord,
      payment,
      requestedPaise,
      reason,
    );

    return this.transformRefundRecord(processedRefund);
  }

  static async getRefundById(id: string): Promise<RefundResult> {
    const refund = await RefundRepository.findRefundById(id);
    if (!refund) {
      throw new AppError("Refund not found", 404, ERRORCODES.REFUND_NOT_FOUND);
    }

    return this.transformRefundRecord(refund);
  }

  static async getRefundsByPaymentId(
    paymentId: string,
  ): Promise<RefundResult[]> {
    const refunds = await RefundRepository.findRefundsByPaymentId(paymentId);
    return refunds.map((r) => this.transformRefundRecord(r));
  }

  public static transformRefundRecord(record: RefundRecord): RefundResult {
    return {
      refundId: record.id,
      paymentId: record.paymentId,
      gateway: record.gateway as PaymentGatewayName,
      gatewayRefundId: record.gatewayRefundId,
      amountInRupees: record.amount / 100,
      status: record.status as RefundStatus,
      reason: record.reason,
      createdAt: record.createdAt,
    };
  }
}
