import { logger } from "@/utils/logger";
import type { Request, Response, NextFunction } from "express";
import { ZodObject, ZodUUID } from "zod";

export const validator = (
  schema: ZodObject<any> | ZodUUID,
  segment: "body" | "params" = "body",
) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (segment === "params") {
      schema.parse(req.params.id);
    } else {
      req.body = schema.parse(req.body);
    }
    next();
  };
};
