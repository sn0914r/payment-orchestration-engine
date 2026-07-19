import { assertValidWebhookSignature } from "./webhook.helpers";
import { AppError } from "@/errors/AppError";
import { ERRORCODES } from "@/constants";

describe("assertValidWebhookSignature", () => {
  it("should do nothing when the signature is valid (true)", () => {
    expect(() => assertValidWebhookSignature(true)).not.toThrow();
  });

  it("should throw an AppError when the signature is invalid (false)", () => {
    expect(() => assertValidWebhookSignature(false)).toThrow(AppError);
  });

  it("should throw with message 'Invalid webhook signature'", () => {
    expect(() => assertValidWebhookSignature(false)).toThrow(
      "Invalid webhook signature",
    );
  });

  it("should throw with HTTP status code 400", () => {
    try {
      assertValidWebhookSignature(false);
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).statusCode).toBe(400);
    }
  });

  it("should throw with the correct error code INVALID_WEBHOOK_SIGNATURE", () => {
    try {
      assertValidWebhookSignature(false);
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).errorCode).toBe(
        ERRORCODES.INVALID_WEBHOOK_SIGNATURE,
      );
    }
  });

  it("should throw an AppError (not a plain Error)", () => {
    let caughtError: unknown;

    try {
      assertValidWebhookSignature(false);
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeInstanceOf(AppError);
    expect(caughtError).toBeInstanceOf(Error);
  });
});
