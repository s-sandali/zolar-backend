import { z } from "zod";
import { PaymentStatusEnum, IdParamDto } from "./shared.dto";

/**
 * Query parameters for GET /api/invoices
 */
export const GetInvoicesQueryDto = z.object({
  status: PaymentStatusEnum.optional(),
});

/**
 * Path parameters for invoice-specific routes
 */
export const InvoiceIdParamDto = IdParamDto;

/**
 * Query parameters for admin GET /api/invoices/admin/all
 */
export const GetAllInvoicesQueryDto = GetInvoicesQueryDto;
