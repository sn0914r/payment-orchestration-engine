import express from "express";
import { globalErrorHandler } from "./middlewares/errorHandler";

export const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.send("ok");
});

app.use(globalErrorHandler);
