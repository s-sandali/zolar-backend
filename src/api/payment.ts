import express from "express";
import {
  createCheckoutSession,
  getSessionStatus,
  createCheckoutSessionValidator,
  getSessionStatusValidator,
} from "../application/payment";
import { authenticationMiddleware } from "./middlewares/authentication-middleware";

const paymentRouter = express.Router();

paymentRouter
  .route("/create-checkout-session")
  .post(
    authenticationMiddleware,
    createCheckoutSessionValidator,
    createCheckoutSession
  );

paymentRouter
  .route("/session-status")
  .get(
    authenticationMiddleware,
    getSessionStatusValidator,
    getSessionStatus
  );

export default paymentRouter;
