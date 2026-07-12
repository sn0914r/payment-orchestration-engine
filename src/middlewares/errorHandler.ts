import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { configs } from "../configs";
import { logger } from "../utils/logger";
import { ERRORCODES } from "../constants/errorCodes";
import { AppError } from "../errors/AppError";

export const globalErrorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
): any => {
  logger.error(err);
  const isProd = configs.NODE_ENV === "production";

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errorCode: ERRORCODES.VALIDATION_ERROR,
      errors: err.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errorCode: err.errorCode,
      errors: err.errors,
      stack: isProd ? undefined : err.stack,
    });
  }

  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
    errorCode: ERRORCODES.INTERNAL_SERVER_ERROR,
    stack: isProd ? undefined : err.stack,
  });
};
