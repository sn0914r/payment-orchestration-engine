import { ERRORCODES, PAYMENT } from "@/constants";
import { AppError } from "@/errors/AppError";
import { GatewayFactory } from "../gateways/gateway.factory";
import { RoutingEngine } from "../routing/routing.engine";
import { PaymentRepository } from "./payment.repository";
import type {
  InitiatePaymentInput,
  PaymentExecutionResult,
  PaymentGatewayName,
  PaymentTriggeredBy,
} from "./payment.types";

export class PaymentExecutor {
  private static async failPayment(
    paymentId: string,
    gateway: PaymentGatewayName,
    trigger: PaymentTriggeredBy,
    errorType: string,
    error: AppError,
  ): Promise<never> {
    await PaymentRepository.markPaymentRecordFailed(paymentId, gateway);
    await PaymentRepository.logPaymentEvent({
      paymentId,
      fromStatus: PAYMENT.STATUS.INITIATED,
      toStatus: PAYMENT.STATUS.FAILED,
      trigger,
      payload: { gateway, errorType },
    });

    throw error;
  }

  private static async handleGatewayFailure(
    paymentId: string,
    currentGateway: PaymentGatewayName,
    err: unknown,
  ): Promise<PaymentGatewayName> {
    const gateway = GatewayFactory.getGateway(currentGateway);
    const errorType = gateway.classifyError(err);

    await PaymentRepository.logGatewayAttempt({
      paymentId,
      gateway: currentGateway,
      status: PAYMENT.GATEWAY_ATTEMPTS_STATUS.ERROR,
      errorType,
    });

    if (errorType === PAYMENT.ERROR_TYPES.USER_ERROR) {
      return this.failPayment(
        paymentId,
        currentGateway,
        PAYMENT.TRIGGERS.USER_ERROR,
        errorType,
        new AppError("Payment failed", 400, ERRORCODES.USER_PAYMENT_FAILED),
      );
    }

    await PaymentRepository.logPaymentEvent({
      paymentId,
      fromStatus: PAYMENT.STATUS.INITIATED,
      toStatus: PAYMENT.STATUS.INITIATED,
      trigger: PAYMENT.TRIGGERS.GATEWAY_ERROR,
      payload: { gateway: currentGateway, errorType },
    });

    const fallback = RoutingEngine.getFallbackGateway(currentGateway);
    if (!fallback) {
      return this.failPayment(
        paymentId,
        currentGateway,
        PAYMENT.TRIGGERS.GATEWAY_ERROR,
        errorType,
        new AppError(
          "All Gateways failed, try again later",
          503,
          ERRORCODES.ALL_GATEWAY_FAILED,
        ),
      );
    }

    await PaymentRepository.logPaymentEvent({
      paymentId,
      fromStatus: PAYMENT.STATUS.INITIATED,
      toStatus: PAYMENT.STATUS.INITIATED,
      trigger: PAYMENT.TRIGGERS.FALLBACK,
      payload: { from: currentGateway, to: fallback },
    });

    return fallback;
  }

  public static async execute(
    paymentId: string,
    initialGateway: PaymentGatewayName,
    data: InitiatePaymentInput,
  ): Promise<PaymentExecutionResult> {
    let currentGateway = initialGateway;
    const attemptedGateways = new Set<PaymentGatewayName>();

    while (true) {
      if (attemptedGateways.has(currentGateway)) {
        throw new AppError(
          "All Gateways failed, try again later",
          503,
          ERRORCODES.ALL_GATEWAY_FAILED,
        );
      }
      attemptedGateways.add(currentGateway);

      try {
        const gateway = GatewayFactory.getGateway(currentGateway);

        const response = await gateway.initiatePayment({
          amount: data.amountInRupees,
          method: data.method,
          orderId: data.orderId,
          customer: data.customer,
        });

        await PaymentRepository.logGatewayAttempt({
          paymentId,
          gateway: currentGateway,
          status: PAYMENT.GATEWAY_ATTEMPTS_STATUS.SUCCESS,
        });

        return { gateway: currentGateway, response };
      } catch (error) {
        currentGateway = await this.handleGatewayFailure(
          paymentId,
          currentGateway,
          error,
        );
      }
    }
  }
}
