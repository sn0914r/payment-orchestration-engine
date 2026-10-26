import { PAYMENT } from "@/constants";
import { logger } from "@/utils/logger";
import { GatewayFactory } from "../gateways/gateway.factory";
import { PaymentRepository } from "../payments/payment.repository";
import { RefundRepository } from "./refund.repository";
import type { PaymentGatewayName, RefundRecord } from "./refund.types";

type PaymentRecord = NonNullable<
  Awaited<ReturnType<typeof PaymentRepository.findPaymentById>>
>;

export class RefundExecutor {
  static async execute(
    refundRecord: RefundRecord,
    payment: PaymentRecord,
    requestedPaise: number,
    reason?: string,
  ): Promise<RefundRecord> {
    try {
      const gateway = GatewayFactory.getGateway(
        payment.gateway as PaymentGatewayName,
      );

      const gatewayRefund = await gateway.refundPayment({
        gatewayPaymentId: payment.gatewayPaymentId || "",
        gatewayOrderId: payment.gatewayOrderId || undefined,
        amountInPaise: requestedPaise,
        reason,
      });

      const processedRefund = await RefundRepository.markRefundProcessed(
        refundRecord.id,
        gatewayRefund.gatewayRefundId,
      );

      await this.updatePaymentStatus(payment);

      logger.info(
        {
          refundId: processedRefund.id,
          gatewayRefundId: gatewayRefund.gatewayRefundId,
        },
        "Refund processed successfully",
      );

      return processedRefund;
    } catch (error) {
      logger.error(
        { err: error, refundId: refundRecord.id },
        "Gateway refund execution failed",
      );

      await RefundRepository.markRefundFailed(refundRecord.id);
      throw error;
    }
  }

  private static async updatePaymentStatus(
    payment: PaymentRecord,
  ): Promise<void> {
    const totalProcessed = await RefundRepository.getTotalProcessedRefundAmount(
      payment.id,
    );

    const newStatus =
      totalProcessed >= payment.amount
        ? PAYMENT.STATUS.REFUNDED
        : PAYMENT.STATUS.PARTIALLY_REFUNDED;

    await RefundRepository.updatePaymentRefundStatus(payment.id, newStatus);
  }
}
