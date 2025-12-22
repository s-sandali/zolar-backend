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

const invoiceRouter = express.Router();

// User routes
invoiceRouter.route("/").get(authenticationMiddleware, getInvoicesValidator, getUserInvoices);

invoiceRouter.route("/pending-count").get(authenticationMiddleware, getPendingInvoiceCount);
invoiceRouter.route("/:id").get(authenticationMiddleware, invoiceIdParamValidator, getInvoiceById);

// Admin routes
invoiceRouter.route("/admin/all").get(authenticationMiddleware, authorizationMiddleware, getAllInvoicesValidator, getAllInvoices);

export default invoiceRouter;
