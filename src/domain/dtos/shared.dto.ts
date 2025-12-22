import { z } from "zod";

/**
 * MongoDB ObjectId validation
 */
export const mongoIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId");

/**
 * Shared param DTO for routes with :id parameter
 */
export const IdParamDto = z.object({
  id: mongoIdSchema,
});

/**
 * Pagination query parameters
 */
export const PaginationQueryDto = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1)).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(100)).optional(),
});

/**
 * Date range query parameters
 */
export const DateRangeQueryDto = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * Common status enum
 */
export const StatusEnum = z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]);

/**
 * Payment status enum
 */
export const PaymentStatusEnum = z.enum(["PENDING", "PAID", "OVERDUE", "CANCELLED"]);

/**
 * Anomaly status enum
 */
export const AnomalyStatusEnum = z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED"]);

/**
 * Anomaly severity enum
 */
export const AnomalySeverityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

/**
 * Anomaly type enum
 */
export const AnomalyTypeEnum = z.enum(["ZERO_GENERATION", "NIGHTTIME_GENERATION", "LOW_OUTPUT"]);
