import type {
  InitiatePaymentReturnType,
  InitiatePaymentType,
} from "../payment.types";
import { ERRORCODES, PAYMENT } from "@/constants";
import { AppError } from "@/errors/AppError";
import {
  getFallbackGateway,
  getRoutingGateway,
} from "@/modules/routing/routing.service";
import { getGateway } from "@/modules/gateways/gateway.factory";
import {
  findOrderByOrderId,
  insertPaymentRecord,
  logGatewayAttempt,
  logPaymentEvent,
  markPaymentRecordFailed,
  updatePaymentRecordGatewayDetails,
} from "../payment.repository";
import {
  assertOrderNotAlreadyPaid,
  assertPaymentRecordCreated,
} from "../payment.helpers";

export const initiatePayment = async (
  data: InitiatePaymentType,
): Promise<InitiatePaymentReturnType> => {
  const { amountInRupees, method, orderId, idempotencyKey, customer } = data;

  const order = await findOrderByOrderId(orderId);
  assertOrderNotAlreadyPaid(order);

  const paymentRecord = await insertPaymentRecord(
    idempotencyKey,
    orderId,
    method,
    amountInRupees,
  );
  assertPaymentRecordCreated(paymentRecord);

  await logPaymentEvent({
    paymentId: paymentRecord.id,
    fromStatus: null,
    toStatus: PAYMENT.STATUS.INITIATED,
    trigger: PAYMENT.TRIGGERS.API_CALL,
    payload: {
      method,
      amountInRupees,
    },
  });

  let gatewayName = getRoutingGateway(method, amountInRupees);

  await logPaymentEvent({
    paymentId: paymentRecord.id,
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
        orderId,
        customer,
      });

      await logGatewayAttempt({
        paymentId: paymentRecord.id,
        gateway: gatewayName,
        status: PAYMENT.GATEWAY_ATTEMPTS_STATUS.SUCCESS,
      });

      break;
    } catch (err) {
      const gateway = getGateway(gatewayName);
      const errorType = gateway.classifyError(err);

      await logGatewayAttempt({
        paymentId: paymentRecord.id,
        gateway: gatewayName,
        status: PAYMENT.GATEWAY_ATTEMPTS_STATUS.ERROR,
        errorType,
      });

      if (errorType === PAYMENT.ERROR_TYPES.USER_ERROR) {
        await markPaymentRecordFailed(paymentRecord.id, gatewayName);
        await logPaymentEvent({
          paymentId: paymentRecord.id,
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
        paymentId: paymentRecord.id,
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
        await markPaymentRecordFailed(paymentRecord.id, gatewayName);
        await logPaymentEvent({
          paymentId: paymentRecord.id,
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
        paymentId: paymentRecord.id,
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

  await updatePaymentRecordGatewayDetails(
    paymentRecord.id,
    gatewayName,
    gatewayResponse.gatewayOrderId,
    PAYMENT.STATUS.INITIATED,
  );

  if (
    gatewayName === PAYMENT.GATEWAYS.CASHFREE ||
    gatewayName === PAYMENT.GATEWAYS.RAZORPAY
  ) {
    return {
      paymentId: paymentRecord.id,
      orderId: gatewayResponse.gatewayOrderId,
      gateway: gatewayName,
      paymentLink: gatewayResponse.paymentLink,
      paymentMethod: method,
      keyId: gatewayResponse.keyId,
    };
  } else {
    throw new AppError("Unknown gateway", 500, ERRORCODES.UNKNOWN_GATEWAY);
  }
};
