import { z } from "zod";
import { PAYMENT } from "@/constants";

export const TriggerReconciliationSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  gateway: z.enum(
    Object.values(PAYMENT.GATEWAYS) as [string, ...string[]],
  ),
});

export const RunIdParamSchema = z.object({
  runId: z.string().uuid("Invalid run ID"),
});

export const MismatchIdParamSchema = z.object({
  id: z.string().uuid("Invalid mismatch ID"),
});

export const ResolveMismatchSchema = z.object({
  note: z.string().optional(),
});
