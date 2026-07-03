import pino from "pino";
import { configs } from "../configs";

export const logger = pino({
  level: configs.NODE_ENV === "production" ? "info" : "debug",
  transport:
    configs.NODE_ENV !== "production"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});
