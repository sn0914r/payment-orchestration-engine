import type { Request, Response, NextFunction } from "express";
import { ZodObject } from "zod";

export const validator = (schema: ZodObject<any>) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const validatedData = schema.parse(req.body);
    req.body = validatedData;
    next();
  };
};
