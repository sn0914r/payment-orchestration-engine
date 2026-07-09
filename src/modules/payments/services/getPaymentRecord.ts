import { db } from "@/clients/pgsql";
import { ERRORCODES } from "@/constants";
import { PaymentsTable } from "@/db/schema";
import { AppError } from "@/errors/AppError";
import { formatPaymentRecord } from "../payment.helpers";
import type { PaymentRecord } from "../payment.types";
import { eq } from "drizzle-orm";

export const getPaymentRecord = async (paymentId: string) => {
  const [paymentRecord] = await db
    .select()
    .from(PaymentsTable)
    .where(eq(PaymentsTable.id, paymentId));

  if (!paymentRecord) {
    throw new AppError(
      "Payment record not found",
      404,
      ERRORCODES.PAYMENT_NOT_FOUND,
    );
  }
  const formattedRecord = formatPaymentRecord(paymentRecord as PaymentRecord);
  return formattedRecord;
};
