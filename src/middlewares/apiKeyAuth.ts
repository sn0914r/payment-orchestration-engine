import crypto from "crypto";
import { configs } from "@/configs";
import { ERRORCODES } from "@/constants";
import { AppError } from "@/errors/AppError";
import type { Request, Response, NextFunction } from "express";

export const apiKeyAuth = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const providedKey = req.header("x-api-key");

  if (!providedKey) {
    throw new AppError("Unauthorized", 401, ERRORCODES.UNAUTHORIZED);
  }

  const expectedBytes = Buffer.from(configs.INTERNAL_API_KEY);
  const providedBytes = Buffer.from(providedKey);

  if (expectedBytes.length !== providedBytes.length) {
    throw new AppError("Unauthorized", 401, ERRORCODES.UNAUTHORIZED);
  }

  const isKeyValid = crypto.timingSafeEqual(expectedBytes, providedBytes);

  if (!isKeyValid) {
    throw new AppError("Unauthorized", 401, ERRORCODES.UNAUTHORIZED);
  }

  next();
};
