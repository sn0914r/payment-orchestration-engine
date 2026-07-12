import { db } from "@/clients/pgsql";
import type { InitiatePaymentReturn } from "../payment.types";
import { PaymentsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ERRORCODES, PAYMENT } from "@/constants";
import { AppError } from "@/errors/AppError";
import {
  getFallbackGateway,
  getRoutingGateway,
} from "@/modules/routing/routing.service";
import { getGateway } from "@/modules/gateways/gateway.factory";
import { GatewayAttempts } from "@/db/schema/gatewayAttempts.schema";
import { logger } from "@/utils/logger";

export const initiatePayment = async (
  amountInRupees: number,
  method: string,
  orderId: string,
  idempotencyKey: string,
  currency: string = "INR",
  customer: {
    id: string;
    phone: string;
    email?: string;
  },
): Promise<InitiatePaymentReturn | {}> => {
  const [order] = await db
    .select()
    .from(PaymentsTable)
    .where(eq(PaymentsTable.orderId, orderId));

  if (order && order.status === PAYMENT.STATUS.SUCCESS) {
    throw new AppError(
      "Payment has already been completed for this order",
      409,
      ERRORCODES.ORDER_ALREADY_PAID,
    );
  }

  let gatewayName = getRoutingGateway(method, amountInRupees);
  logger.info(`${gatewayName} IS PICKED FOR THE PAYMENT`);

  const paymentId = await createPaymentRecord({
    idempotencyKey,
    orderId,
    method,
    amount: amountInRupees,
  });

  let gatewayResponse;
  while (true) {
    try {
      const gateway = getGateway(gatewayName);
      gatewayResponse = await gateway.initiatePayment({
        amount: amountInRupees,
        method,
        currency,
        orderId: orderId,
        customer,
      });

      await logGatewayAttempt(
        paymentId,
        gatewayName,
        PAYMENT.GATEWAY_ATTEMPTS_STATUS.SUCCESS,
      );

      break;
    } catch (err) {
      const gateway = getGateway(gatewayName);
      const errorType = gateway.classifyError(err);

      await logGatewayAttempt(
        paymentId,
        gatewayName,
        PAYMENT.GATEWAY_ATTEMPTS_STATUS.ERROR,
        errorType,
      );

      if (errorType === PAYMENT.ERROR_TYPES.USER_ERROR) {
        await updatePaymentRecordFailed(paymentId, gatewayName);
        throw new AppError(
          "Payment failed",
          400,
          ERRORCODES.USER_PAYMENT_FAILED,
        );
      }

      const fallback = getFallbackGateway(gatewayName);
      if (!fallback) {
        await updatePaymentRecordFailed(paymentId, gatewayName);
        throw new AppError(
          "All Gateways failed, try again later",
          503,
          ERRORCODES.ALL_GATEWAY_FAILED,
        );
      }

      gatewayName = fallback;
    }
  }

  await updatePaymentRecordWithGatewayDetails(
    paymentId,
    gatewayName,
    gatewayResponse.gatewayOrderId,
    PAYMENT.STATUS.INITIATED,
  );

  let response = {};
  if (gatewayName === PAYMENT.GATEWAYS.CASHFREE) {
    response = {
      orderId: gatewayResponse.gatewayOrderId,
      gateway: gatewayName,
      paymentLink: gatewayResponse.paymentLink,
      paymentMethod: method,
    };
  } else if (gatewayName === PAYMENT.GATEWAYS.RAZORPAY) {
    response = {
      orderId: gatewayResponse.gatewayOrderId,
      gateway: gatewayName,
      paymentMethod: method,
      keyId: gatewayResponse.keyId,
    };
  } else {
    response = {
      orderId: null,
      gateway: null,
      paymentMethod: method,
    };
  }

  return response;
};

const logGatewayAttempt = async (
  paymentId: string,
  gateway: string,
  status: string,
  errorType?: string,
  errorCode?: string,
) => {
  await db
    .insert(GatewayAttempts)
    .values({ paymentId, gateway, status, errorCode, errorType });
};

const createPaymentRecord = async (data: {
  idempotencyKey: string;
  orderId: string;
  method: string;
  amount: number;
}) => {
  const [paymentRecord] = await db
    .insert(PaymentsTable)
    .values({ ...data, amount: data.amount * 100 })
    .returning();

  if (!paymentRecord) {
    throw new AppError(
      "Failed to initiate payment",
      500,
      ERRORCODES.PAYMENT_INITIATION_FAILED,
    );
  }

  return paymentRecord.id;
};

const updatePaymentRecordWithGatewayDetails = async (
  paymentId: string,
  gatewayName: string,
  gatewayOrderId: string,
  status: string,
) => {
  await db
    .update(PaymentsTable)
    .set({ gateway: gatewayName, gatewayOrderId, status })
    .where(eq(PaymentsTable.id, paymentId));
};

const updatePaymentRecordFailed = async (
  paymentId: string,
  gatewayName: string,
) => {
  await db
    .update(PaymentsTable)
    .set({ gateway: gatewayName, status: PAYMENT.STATUS.FAILED })
    .where(eq(PaymentsTable.id, paymentId));
};
