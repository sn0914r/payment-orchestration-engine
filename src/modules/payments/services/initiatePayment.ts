import { db } from "@/clients/pgsql";
import type { InitiatePaymentReturn } from "../payment.types";
import { PaymentsEventsTable, PaymentsTable } from "@/db/schema";
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
  currency: string,
  customer: {
    id: string;
    phone: string;
    email?: string;
  },
): Promise<InitiatePaymentReturn> => {
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
  const paymentId = await createPaymentRecord({
    idempotencyKey,
    orderId,
    method,
    amount: amountInRupees,
  });

  await logPaymentEvent({
    paymentId,
    fromStatus: null,
    toStatus: PAYMENT.STATUS.INITIATED,
    trigger: PAYMENT.TRIGGERS.API_CALL,
    payload: {
      method,
      amountInRupees,
    },
  });

  let gatewayName = getRoutingGateway(method, amountInRupees);
  logger.info(`${gatewayName} IS PICKED FOR THE PAYMENT`);
  await logPaymentEvent({
    paymentId,
    fromStatus: PAYMENT.STATUS.INITIATED,
    toStatus: PAYMENT.STATUS.INITIATED,
    trigger: PAYMENT.TRIGGERS.ROUTING_DECISION,
    payload: { selectedGateway: gatewayName, reason: method },
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
        await logPaymentEvent({
          paymentId,
          fromStatus: PAYMENT.STATUS.INITIATED,
          toStatus: PAYMENT.STATUS.FAILED,
          trigger: PAYMENT.TRIGGERS.USER_ERROR,
          payload: {
            gateway: gatewayName,
            errorType,
          },
        });

        throw new AppError(
          "Payment failed",
          400,
          ERRORCODES.USER_PAYMENT_FAILED,
        );
      }
      await logPaymentEvent({
        paymentId,
        fromStatus: PAYMENT.STATUS.INITIATED,
        toStatus: PAYMENT.STATUS.INITIATED,
        trigger: PAYMENT.TRIGGERS.GATEWAY_ERROR,
        payload: {
          gateway: gatewayName,
          errorType,
        },
      });

      const fallback = getFallbackGateway(gatewayName);
      if (!fallback) {
        await updatePaymentRecordFailed(paymentId, gatewayName);
        await logPaymentEvent({
          paymentId,
          fromStatus: PAYMENT.STATUS.INITIATED,
          toStatus: PAYMENT.STATUS.FAILED,
          trigger: PAYMENT.TRIGGERS.GATEWAY_ERROR,
          payload: { gateway: gatewayName, errorType },
        });

        throw new AppError(
          "All Gateways failed, try again later",
          503,
          ERRORCODES.ALL_GATEWAY_FAILED,
        );
      }

      await logPaymentEvent({
        paymentId,
        fromStatus: PAYMENT.STATUS.INITIATED,
        toStatus: PAYMENT.STATUS.INITIATED,
        trigger: PAYMENT.TRIGGERS.FALLBACK,
        payload: {
          from: gatewayName,
          to: fallback,
        },
      });

      gatewayName = fallback;
    }
  }

  await updatePaymentRecordWithGatewayDetails(
    paymentId,
    gatewayName,
    gatewayResponse.gatewayOrderId,
    PAYMENT.STATUS.INITIATED,
  );

  if (
    gatewayName === PAYMENT.GATEWAYS.CASHFREE ||
    gatewayName === PAYMENT.GATEWAYS.RAZORPAY
  ) {
    return {
      paymentId,
      orderId: gatewayResponse.gatewayOrderId,
      gateway: gatewayName,
      paymentLink: gatewayResponse.paymentLink,
      paymentMethod: method,
      keyId: gatewayResponse.keyId,
    };
    // } else if (gatewayName === PAYMENT.GATEWAYS.RAZORPAY) {
    //   return {

    //   };
  } else {
    throw new AppError("Unknown gateway", 500, ERRORCODES.UNKNOWN_GATEWAY);
  }
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

interface LogPaymentEventInterface {
  paymentId: string;
  fromStatus: string | null;
  toStatus: string;
  trigger: string;
  payload: Record<string, any>;
}

export const logPaymentEvent = async ({
  paymentId,
  fromStatus,
  toStatus,
  trigger,
  payload,
}: LogPaymentEventInterface) => {
  await db.insert(PaymentsEventsTable).values({
    paymentId,
    fromStatus,
    toStatus,
    trigger,
    payload,
  });
};
