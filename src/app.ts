import express from "express";
import cors from "cors";
import { globalErrorHandler } from "./middlewares/errorHandler";
import { paymentRouter } from "./modules/payments/payment.routes";
import { webhookRouter } from "./modules/webhooks/webhook.routes";

export const app = express();

app.use(cors());

app.use("/webhooks", webhookRouter);
app.use(express.json());
app.use("/payments", paymentRouter);

app.get("/health", (_req, res) => {
  res.send("ok");
});

app.use(globalErrorHandler);
