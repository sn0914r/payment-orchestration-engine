import { AppError } from "@/errors/AppError";
import { ERRORCODES } from "@/constants/errorCodes";
import { CashfreeGateway } from "./adapters/cashfree.adapter";
import { RazorpayGateway } from "./adapters/razorpay.adapter";
import type { Gateway, PaymentGatewayName } from "./gateway.types";

export class GatewayFactory {
  private static gateways: Record<string, Gateway> = {
    razorpay: new RazorpayGateway(),
    cashfree: new CashfreeGateway(),
  };

  public static getGateway(name: PaymentGatewayName): Gateway {
    const gateway = this.gateways[name];

    if (!gateway) {
      throw new AppError(
        `Unknown gateway: ${name}`,
        400,
        ERRORCODES.INVALID_GATEWAY,
      );
    }

    return gateway;
  }
}
