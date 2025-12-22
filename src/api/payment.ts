import express from "express";
import {
  createCheckoutSession,
  getSessionStatus,
  createCheckoutSessionValidator,
  getSessionStatusValidator,
} from "../application/payment";
import { authenticationMiddleware } from "./middlewares/authentication-middleware";

const paymentRouter = express.Router();

paymentRouter.post( "/create-checkout-session", authenticationMiddleware,  createCheckoutSessionValidator,  createCheckoutSession);

paymentRouter.get("/session-status",authenticationMiddleware, getSessionStatusValidator,  getSessionStatus);

export default paymentRouter;
