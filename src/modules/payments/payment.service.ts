import { ERRORCODES, PAYMENT } from "@/constants";
import { AppError } from "@/errors/AppError";
import { RoutingEngine } from "../routing/routing.engine";
import { PaymentRepository } from "./payment.repository";
import { PaymentExecutor } from "./payment.executor";
import type {
  InitiatePaymentInput,
  InitiatePaymentResult,
  PaymentGatewayName,
  PaymentMethod,
  PaymentRecord,
} from "./payment.types";

export class PaymentService {
  private static async validateNewOrder(orderId: string): Promise<void> {
    const existingOrder = await PaymentRepository.findOrderByOrderId(orderId);

    if (existingOrder && existingOrder.status === PAYMENT.STATUS.SUCCESS) {
      throw new AppError(
        "Payment has already been completed for this order",
        409,
        ERRORCODES.ORDER_ALREADY_PAID,
      );
    }
  }

  private static assertPaymentRecordCreated(
    record: PaymentRecord | undefined,
  ): asserts record is PaymentRecord {
    if (!record) {
      throw new AppError(
        "Failed to initiate payment",
        500,
        ERRORCODES.PAYMENT_INITIATION_FAILED,
      );
    }
  }

  private static async createInitialRecord(data: InitiatePaymentInput) {
    const record = await PaymentRepository.createPaymentRecord(
      data.idempotencyKey,
      data.orderId,
      data.method,
      data.amountInRupees,
    );

    this.assertPaymentRecordCreated(record);

    await PaymentRepository.logPaymentEvent({
      paymentId: record.id,
      fromStatus: null,
      toStatus: PAYMENT.STATUS.INITIATED,
      trigger: PAYMENT.TRIGGERS.API_CALL,
      payload: { method: data.method, amountInRupees: data.amountInRupees },
    });

    return record;
  }

  private static async resolveInitialGateway(
    paymentId: string,
    method: PaymentMethod,
    amountInRupees: number,
  ): Promise<PaymentGatewayName> {
    const gateway = RoutingEngine.getRoutingGateway(method, amountInRupees);

    await PaymentRepository.logPaymentEvent({
      paymentId,
      fromStatus: PAYMENT.STATUS.INITIATED,
      toStatus: PAYMENT.STATUS.INITIATED,
      trigger: PAYMENT.TRIGGERS.ROUTING_DECISION,
      payload: { selectedGateway: gateway, reason: method },
    });

    return gateway;
  }

  public static transformPaymentRecord(record: PaymentRecord) {
    return {
      paymentId: record.id,
      orderId: record.orderId,
      status: record.status,
      gateway: record.gateway,
      gatewayOrderId: record.gatewayOrderId,
      gatewayPaymentId: record.gatewayPaymentId,
      amount: record.amount / 100,
      paymentMethod: record.method,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  // INFO: Public APIs

  public static async initiate(
    data: InitiatePaymentInput,
  ): Promise<InitiatePaymentResult> {
    await this.validateNewOrder(data.orderId);

    const paymentRecord = await this.createInitialRecord(data);

    const initialGateway = await this.resolveInitialGateway(
      paymentRecord.id,
      data.method,
      data.amountInRupees,
    );

    const { gateway, response } = await PaymentExecutor.execute(
      paymentRecord.id,
      initialGateway,
      data,
    );

    await PaymentRepository.updatePaymentRecordGatewayDetails(
      paymentRecord.id,
      gateway,
      response.gatewayOrderId,
      PAYMENT.STATUS.INITIATED,
    );

    return {
      paymentId: paymentRecord.id,
      orderId: response.gatewayOrderId,
      gateway,
      paymentLink: response.paymentLink,
      paymentMethod: data.method,
      keyId: response.keyId,
    };
  }

  public static async getById(paymentId: string) {
    const paymentRecord = await PaymentRepository.findPaymentById(paymentId);
    this.assertPaymentRecordCreated(paymentRecord);

    return this.transformPaymentRecord(paymentRecord);
  }
}
