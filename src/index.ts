import "dotenv/config";
import express from "express";
import energyGenerationRecordRouter from "./api/energy-generation-record";
import { globalErrorHandler } from "./api/middlewares/global-error-handling-middleware";
import { loggerMiddleware } from "./api/middlewares/logger-middleware";
import solarUnitRouter from "./api/solar-unit";
import { connectDB } from "./infrastructure/db";
import { initializeScheduler } from "./infrastructure/scheduler";
import { initializeAnomalyDetection } from "./infrastructure/anomaly-detection-scheduler";
import cors from "cors";
import webhooksRouter from "./api/webhooks";
import { clerkMiddleware } from "@clerk/express";
import usersRouter from "./api/users";
import weatherRouter from "./api/weather";
import anomaliesRouter from "./api/anomalies";
import analyticsRouter from "./api/analytics";
import invoiceRouter from "./api/invoice";
import paymentRouter from "./api/payment";
import { handleStripeWebhook } from "./application/payment";

const server = express();
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

server.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

server.use(loggerMiddleware);

server.use("/api/webhooks", webhooksRouter);

// IMPORTANT: Stripe webhook MUST be before express.json() to receive raw body
server.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

server.use(clerkMiddleware())

server.use(express.json());

server.use("/api/solar-units", solarUnitRouter);
server.use("/api/energy-generation-records", energyGenerationRecordRouter);
server.use("/api/users", usersRouter);
server.use("/api/weather", weatherRouter);
server.use("/api/anomalies", anomaliesRouter);
server.use("/api/analytics", analyticsRouter);
server.use("/api/invoices", invoiceRouter);
server.use("/api/payments", paymentRouter);

server.use(globalErrorHandler);

connectDB();
initializeScheduler();
initializeAnomalyDetection();

const PORT = Number(process.env.PORT) || 8000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
