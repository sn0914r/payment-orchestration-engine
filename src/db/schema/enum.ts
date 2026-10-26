import { pgEnum } from "drizzle-orm/pg-core";
import { PAYMENT, RECONCILIATION } from "@/constants";

export const errorTypeEnum = pgEnum(
  "payment_error_type",
  Object.values(PAYMENT.ERROR_TYPES) as [string, ...string[]],
);

export const gatewayAttemptsStatusEnum = pgEnum(
  "payment_gateway_status",
  Object.values(PAYMENT.GATEWAY_ATTEMPTS_STATUS) as [string, ...string[]],
);

export const gatewaysEnum = pgEnum(
  "gateway",
  Object.values(PAYMENT.GATEWAYS) as [string, ...string[]],
);

export const paymentStatusEnum = pgEnum(
  "status",
  Object.values(PAYMENT.STATUS) as [string, ...string[]],
);

export const paymentMethodEnum = pgEnum(
  "method",
  Object.values(PAYMENT.METHOD) as [string, ...string[]],
);

export const paymentEventTriggerEnum = pgEnum(
  "payment_event_trigger",
  Object.values(PAYMENT.TRIGGERS) as [string, ...string[]],
);

export const reconciliationRunStatusEnum = pgEnum(
  "reconciliation_run_status",
  Object.values(RECONCILIATION.STATUS) as [string, ...string[]],
);

export const reconciliationMismatchTypeEnum = pgEnum(
  "reconciliation_mismatch_type",
  Object.values(RECONCILIATION.MISMATCH_TYPE) as [string, ...string[]],
);

export const refundStatusEnum = pgEnum(
  "refund_status",
  Object.values(PAYMENT.REFUND_STATUS) as [string, ...string[]],
);

