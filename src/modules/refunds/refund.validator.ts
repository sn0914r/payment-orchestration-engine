import { ERRORCODES, PAYMENT } from "@/constants";
import { AppError } from "@/errors/AppError";
import { PaymentRepository } from "../payments/payment.repository";
import { RefundRepository } from "./refund.repository";

type PaymentRecord = NonNullable<
  Awaited<ReturnType<typeof PaymentRepository.findPaymentById>>
>;

export class RefundValidator {
  static assertPaymentFound(
    payment: PaymentRecord | undefined,
  ): asserts payment is PaymentRecord {
    if (!payment) {
      throw new AppError(
        "Payment not found",
        404,
        ERRORCODES.PAYMENT_NOT_FOUND,
      );
    }
  }

  static async validateEligibility(
    payment: PaymentRecord,
    requestedPaise: number,
  ): Promise<void> {
    this.assertEligibleStatus(payment);
    this.assertGatewayPresent(payment);
    await this.assertAmountWithinRemainingBalance(payment, requestedPaise);
  }

  private static assertEligibleStatus(payment: PaymentRecord): void {
    const isEligible =
      payment.status === PAYMENT.STATUS.SUCCESS ||
      payment.status === PAYMENT.STATUS.PARTIALLY_REFUNDED;

    if (!isEligible) {
      throw new AppError(
        `Cannot refund payment with status: ${payment.status}`,
        400,
        ERRORCODES.REFUND_INVALID_PAYMENT_STATUS,
      );
    }
  }

  private static assertGatewayPresent(payment: PaymentRecord): void {
    if (!payment.gateway) {
      throw new AppError(
        "Payment has no associated gateway",
        400,
        ERRORCODES.INVALID_GATEWAY,
      );
    }
  }

  private static async assertAmountWithinRemainingBalance(
    payment: PaymentRecord,
    requestedPaise: number,
  ): Promise<void> {
    const totalProcessed = await RefundRepository.getTotalProcessedRefundAmount(
      payment.id,
    );
    const remainingRefundable = payment.amount - totalProcessed;

    if (requestedPaise > remainingRefundable) {
      const remainingRupees = remainingRefundable / 100;
      throw new AppError(
        `Refund amount exceeds remaining balance. Max refundable: ₹${remainingRupees}`,
        400,
        ERRORCODES.REFUND_AMOUNT_EXCEEDED,
      );
    }
  }
}
