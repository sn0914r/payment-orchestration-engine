import { cashfree } from "@/clients/cashfree";
import type { CashfreeRequestShape } from "@/types";

export const createCashfreeOrder = async (request: CashfreeRequestShape) => {
  const order = await cashfree.PGCreateOrder({
    order_currency: "INR",
    ...request,
  });

  return {
    gatewayOrderId: order.data.order_id,
    paymentSession: order.data.payment_session_id,
  };
};
