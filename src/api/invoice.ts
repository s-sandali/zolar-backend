import express from "express";
import {
  getUserInvoices,
  getInvoiceById,
  getAllInvoices,
  getPendingInvoiceCount,
  getInvoicesValidator,
  invoiceIdParamValidator,
  getAllInvoicesValidator,
} from "../application/invoice";
import { authenticationMiddleware } from "./middlewares/authentication-middleware";
import { authorizationMiddleware } from "./middlewares/authorization-middleware";
import { generateMonthlyInvoices } from "../application/background/generate-invoices";

const invoiceRouter = express.Router();

// User routes
invoiceRouter.route("/").get(authenticationMiddleware, getInvoicesValidator, getUserInvoices);

invoiceRouter.route("/pending-count").get(authenticationMiddleware, getPendingInvoiceCount);
invoiceRouter.route("/:id").get(authenticationMiddleware, invoiceIdParamValidator, getInvoiceById);

// Admin routes
invoiceRouter.route("/admin/all").get(authenticationMiddleware, authorizationMiddleware, getAllInvoicesValidator, getAllInvoices);

// Manual invoice generation trigger (for testing/admin purposes)
invoiceRouter.route("/admin/generate").post(authenticationMiddleware, authorizationMiddleware, async (_req, res) => {
  try {
    // Force generate invoices regardless of date
    await generateMonthlyInvoices(true);
    res.json({
      success: true,
      message: "Invoice generation triggered successfully. Check server logs for details."
    });
  } catch (error) {
    console.error("Manual invoice generation failed:", error);
    res.status(500).json({
      success: false,
      message: "Invoice generation failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default invoiceRouter;
