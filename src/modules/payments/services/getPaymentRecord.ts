import {
  assertPaymentRecordCreated,
  transformPaymentRecord,
} from "../payment.helpers";
import { findPaymentByPaymentId } from "../payment.repository";

export const getPaymentRecord = async (paymentId: string) => {
  const paymentRecord = await findPaymentByPaymentId(paymentId);
  assertPaymentRecordCreated(paymentRecord);

  return transformPaymentRecord(paymentRecord);
};
