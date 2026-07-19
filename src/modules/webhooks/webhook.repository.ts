import { db } from "@/clients/pgsql";
import { PaymentsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PaymentStatus } from "@/types";

export const findOrderByGatewayOrderId = async (gatewayOrderId: string) => {
  const [order] = await db
    .select()
    .from(PaymentsTable)
    .where(eq(PaymentsTable.gatewayOrderId, gatewayOrderId));

  return order;
};

export const updatePaymentStatusByGatewayOrderId = async (
  gatewayOrderId: string,
  gatewayPaymentId: string,
  status: PaymentStatus,
) => {
  await db
    .update(PaymentsTable)
    .set({ status, gatewayPaymentId })
    .where(eq(PaymentsTable.gatewayOrderId, gatewayOrderId));
};
