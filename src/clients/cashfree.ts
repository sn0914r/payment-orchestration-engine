import { configs } from "@/configs";
import { Cashfree, CFEnvironment } from "cashfree-pg";

export const cashfree = new Cashfree(
  CFEnvironment.SANDBOX,
  configs.CASHFREE.CLIENT_ID,
  configs.CASHFREE.CLIENT_SECRET,
);
