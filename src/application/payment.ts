import { Request, Response, NextFunction } from "express";
import Stripe from "stripe";
import { Invoice } from "../infrastructure/entities/Invoice";
import { NotFoundError, ValidationError } from "../domain/errors/errors";
import { getAuth } from "@clerk/express";
import { User } from "../infrastructure/entities/User";
import {
  CreateCheckoutSessionDto,
  GetSessionStatusQueryDto,
} from "../domain/dtos/payment.dto";

/**
 * Validator for POST /api/payments/create-checkout-session body
 */
export const createCheckoutSessionValidator = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const result = CreateCheckoutSessionDto.safeParse(req.body);
  if (!result.success) {
    throw new ValidationError(result.error.message);
  }
  next();
};

/**
 * Validator for GET /api/payments/session-status query
 */
export const getSessionStatusValidator = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const result = GetSessionStatusQueryDto.safeParse(req.query);
  if (!result.success) {
    throw new ValidationError(result.error.message);
  }
  next();
};

// Initialize Stripe SDK
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * Creates a Stripe Checkout Session for an invoice payment
 */
export const createCheckoutSession = async (req: Request, res: Response) => {
  const { invoiceId } = req.body;
  const auth = getAuth(req);
  const clerkUserId = auth.userId;
  const user = await User.findOne({ clerkUserId });
  const userId = user?._id;

  if (!invoiceId) {
    throw new ValidationError("Invoice ID is required");
  }

  // Get invoice and verify ownership
  const invoice = await Invoice.findById(invoiceId);

  if (!invoice) {
    throw new NotFoundError("Invoice not found");
  }

  // Verify user owns this invoice
  if (invoice.userId.toString() !== userId?.toString()) {
    throw new ValidationError("You don't have permission to pay this invoice");
  }

  if (invoice.paymentStatus === "PAID") {
    throw new ValidationError("Invoice already paid");
  }

  if (invoice.totalEnergyGenerated <= 0) {
    throw new ValidationError("Invoice has no billable energy yet");
  }

  // Fetch the price from Stripe to calculate the total amount
  const priceId = process.env.STRIPE_PRICE_ID!;
  const price = await stripe.prices.retrieve(priceId);

  if (!price.unit_amount) {
    throw new ValidationError("Unable to determine price amount");
  }

  const pricePerUnit = price.unit_amount; // Amount in cents

  // With current Stripe price of $0.05 per unit, we charge $0.05 per kWh
  // 1 unit = 1 kWh
  const quantity = Math.max(1, Math.round(invoice.totalEnergyGenerated));
  const estimatedTotal = quantity * pricePerUnit;

  // Stripe requires minimum $0.50 (50 cents) for checkout sessions
  // Do not allow checkout if total is below minimum - let energy accumulate instead
  if (estimatedTotal < 50) {
    throw new ValidationError(
      `Invoice total ($${(estimatedTotal / 100).toFixed(2)}) is below the minimum payment amount of $0.50. Please wait for more energy to accumulate before paying.`
    );
  }

  // Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded",
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID,
        quantity,
      },
    ],
    mode: "payment",
    return_url: `${process.env.FRONTEND_URL}/dashboard/invoices/complete?session_id={CHECKOUT_SESSION_ID}`,
    metadata: {
      invoiceId: invoice._id.toString(), // Critical: links session to invoice
    },
  });

  res.json({ clientSecret: session.client_secret });
};

/**
 * Retrieves the status of a Stripe Checkout Session
 */
export const getSessionStatus = async (req: Request, res: Response) => {
  const { session_id } = req.query;

  if (!session_id || typeof session_id !== "string") {
    throw new ValidationError("Session ID is required");
  }

  const session = await stripe.checkout.sessions.retrieve(session_id);

  res.json({
    status: session.status,
    paymentStatus: session.payment_status,
    amountTotal: session.amount_total, // Amount in cents
  });
};

/**
 * Handles Stripe webhook events
 * SECURITY: Verifies webhook signature to ensure request is from Stripe
 */
export const handleStripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  let event: Stripe.Event;

  // Verify webhook signature (SECURITY: proves request is from Stripe)
  try {
    event = stripe.webhooks.constructEvent(
      req.body, // Must be raw body, not parsed JSON
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle payment completion
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const invoiceId = session.metadata?.invoiceId;

    if (invoiceId && session.payment_status === "paid") {
      await Invoice.findByIdAndUpdate(invoiceId, {
        paymentStatus: "PAID",
        paidAt: new Date(),
      });
      console.log("Invoice marked as PAID:", invoiceId);
    }
  }

  // Handle async payment success (for payment methods that complete asynchronously)
  if (event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    const invoiceId = session.metadata?.invoiceId;

    if (invoiceId) {
      await Invoice.findByIdAndUpdate(invoiceId, {
        paymentStatus: "PAID",
        paidAt: new Date(),
      });
      console.log("Invoice marked as PAID (async):", invoiceId);
    }
  }

  // Handle payment failure
  if (event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const invoiceId = session.metadata?.invoiceId;

    if (invoiceId) {
      await Invoice.findByIdAndUpdate(invoiceId, {
        paymentStatus: "FAILED",
      });
      console.log("Invoice marked as FAILED:", invoiceId);
    }
  }

  // Always return 200 to acknowledge receipt
  res.status(200).json({ received: true });
};
