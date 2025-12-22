import { z } from "zod";
import {
  AnomalyStatusEnum,
  AnomalySeverityEnum,
  AnomalyTypeEnum,
  DateRangeQueryDto,
  IdParamDto,
} from "./shared.dto";

/**
 * Query parameters for GET /api/anomalies/me
 */
export const GetUserAnomaliesQueryDto = z
  .object({
    type: AnomalyTypeEnum.optional(),
    severity: AnomalySeverityEnum.optional(),
    status: AnomalyStatusEnum.optional(),
    limit: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .pipe(z.number().min(1).max(100))
      .optional(),
  })
  .merge(DateRangeQueryDto);

/**
 * Query parameters for GET /api/anomalies (admin)
 */
export const GetAllAnomaliesQueryDto = GetUserAnomaliesQueryDto;

/**
 * Path parameters for anomaly-specific routes
 */
export const AnomalyIdParamDto = IdParamDto;

/**
 * Request body for PATCH /api/anomalies/:id/resolve
 */
export const ResolveAnomalyDto = z.object({
  resolutionNotes: z.string().min(1).max(500).optional(),
});

/**
 * No body required for acknowledge, but we define it for consistency
 */
export const AcknowledgeAnomalyDto = z.object({}).optional();
