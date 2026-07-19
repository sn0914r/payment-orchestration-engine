import express from "express";
import cors from "cors";
import path from "path";
import { globalErrorHandler } from "./middlewares/errorHandler";
import { paymentRouter } from "./modules/payments/payment.routes";
import { webhookRouter } from "./modules/webhooks/webhook.routes";

export const app = express();

app.use(cors());

// --- API Documentation ---
app.get("/docs/openapi.yml", (req, res) => {
  res.sendFile(path.resolve(process.cwd(), "docs/openapi.yml"));
});

app.use("/docs", async (req, res, next) => {
  try {
    const { apiReference } = await import("@scalar/express-api-reference");
    const middleware = apiReference({
      theme: "purple",
      spec: {
        url: "/docs/openapi.yml",
      },
    });
    middleware(req as any, res as any, next);
  } catch (error) {
    next(error);
  }
});
// -------------------------

app.use("/webhooks", webhookRouter);
app.use(express.json());
app.use("/payments", paymentRouter);

app.get("/health", (_req, res) => {
  res.send("ok");
});

app.use(globalErrorHandler);
