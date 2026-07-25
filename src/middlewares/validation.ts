import type { Request, Response, NextFunction } from "express";
import { ZodType, ZodUUID } from "zod";

export const validator = (
  schema: ZodType | ZodUUID,
  segment: "body" | "params" = "body",
) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (segment === "params") {
      schema.parse(req.params);
    } else {
      req.body = schema.parse(req.body);
    }
    next();
  };
};
