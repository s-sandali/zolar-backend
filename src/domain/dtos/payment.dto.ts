import { z } from "zod";
import { mongoIdSchema } from "./shared.dto";

/**
 * Request body for POST /api/payments/create-checkout-session
 */
export const CreateCheckoutSessionDto = z.object({
  invoiceId: mongoIdSchema,
});

/**
 * Query parameters for GET /api/payments/session-status
 */
export const GetSessionStatusQueryDto = z.object({
  session_id: z.string().min(1, "Session ID is required"),
});
