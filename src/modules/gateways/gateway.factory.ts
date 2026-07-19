import { AppError } from "@/errors/AppError";
import { ERRORCODES } from "@/constants/errorCodes";
import { cashfreeGateway } from "./connectors/cashfree.connector";
import { razorpayGateway } from "./connectors/razorpay.connector";
import type { Gateway, PaymentGateway } from "./gateway.types";

const gateways: Record<string, Gateway> = {
  razorpay: razorpayGateway,
  cashfree: cashfreeGateway,
};

export const getGateway = (name: PaymentGateway): Gateway => {
  const gateway = gateways[name];

  if (!gateway) {
    throw new AppError(
      `Unknown gateway: ${name}`,
      400,
      ERRORCODES.INVALID_GATEWAY,
    );
  }

  return gateway;
};
