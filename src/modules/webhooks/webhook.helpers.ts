import { ERRORCODES } from "@/constants";
import { AppError } from "@/errors/AppError";

export const assertValidWebhookSignature = (isValid: boolean) => {
  if (isValid) return;

  throw new AppError(
    "Invalid webhook signature",
    400,
    ERRORCODES.INVALID_WEBHOOK_SIGNATURE,
  );
};
