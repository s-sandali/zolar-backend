import { Request, Response, NextFunction } from "express";
import { Invoice } from "../infrastructure/entities/Invoice";
import { NotFoundError, ValidationError } from "../domain/errors/errors";
import { getAuth } from "@clerk/express";
import { User } from "../infrastructure/entities/User";
import {
  GetInvoicesQueryDto,
  InvoiceIdParamDto,
  GetAllInvoicesQueryDto,
} from "../domain/dtos/invoice.dto";

/**
 * Validator for GET /api/invoices query parameters
 */
export const getInvoicesValidator = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const result = GetInvoicesQueryDto.safeParse(req.query);
  if (!result.success) {
    throw new ValidationError(result.error.message);
  }
  next();
};

/**
 * Validator for invoice ID in URL params
 */
export const invoiceIdParamValidator = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const result = InvoiceIdParamDto.safeParse(req.params);
  if (!result.success) {
    throw new ValidationError(result.error.message);
  }
  next();
};

/**
 * Validator for GET /api/invoices/admin/all query parameters
 */
export const getAllInvoicesValidator = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const result = GetAllInvoicesQueryDto.safeParse(req.query);
  if (!result.success) {
    throw new ValidationError(result.error.message);
  }
  next();
};

/**
 * Get all invoices for the authenticated user
 */
export const getUserInvoices = async (req: Request, res: Response) => {
  const auth = getAuth(req);
  const clerkUserId = auth.userId;
  const user = await User.findOne({ clerkUserId });
  const userId = user?._id;

  const { status } = req.query;

  const query: any = { userId };

  // Filter by payment status if provided
  if (status && typeof status === "string") {
    query.paymentStatus = status.toUpperCase();
  }

  const invoices = await Invoice.find(query)
    .populate("solarUnitId", "serialNumber capacity")
    .sort({ createdAt: -1 });

  res.json(invoices);
};

/**
 * Get a single invoice by ID (user must own the invoice)
 */
export const getInvoiceById = async (req: Request, res: Response) => {
  const auth = getAuth(req);
  const clerkUserId = auth.userId;
  const user = await User.findOne({ clerkUserId });
  const userId = user?._id;

  const { id } = req.params;

  const invoice = await Invoice.findById(id).populate("solarUnitId", "serialNumber capacity location");

  if (!invoice) {
    throw new NotFoundError("Invoice not found");
  }

  // Verify user owns this invoice
  if (invoice.userId.toString() !== userId?.toString()) {
    throw new NotFoundError("Invoice not found");
  }

  res.json(invoice);
};

/**
 * Get all invoices across all users (admin only)
 */
export const getAllInvoices = async (req: Request, res: Response) => {
  const { status } = req.query;

  const query: any = {};

  // Filter by payment status if provided
  if (status && typeof status === "string") {
    query.paymentStatus = status.toUpperCase();
  }

  const invoices = await Invoice.find(query)
    .populate("solarUnitId", "serialNumber capacity")
    .populate("userId", "firstName lastName email")
    .sort({ createdAt: -1 });

  res.json(invoices);
};

/**
 * Get pending invoice count for authenticated user
 */
export const getPendingInvoiceCount = async (req: Request, res: Response) => {
  const auth = getAuth(req);
  const clerkUserId = auth.userId;
  const user = await User.findOne({ clerkUserId });
  const userId = user?._id;

  const count = await Invoice.countDocuments({
    userId,
    paymentStatus: "PENDING",
  });

  res.json({ count });
};
