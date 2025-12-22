import express from "express";
import { handleClerkWebhook } from "../application/webhooks";

const webhooksRouter = express.Router();

webhooksRouter
  .route("/clerk")
  .post(
    express.raw({ type: "application/json" }),
    handleClerkWebhook
  );

export default webhooksRouter;
