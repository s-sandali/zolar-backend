import { z } from "zod";
import { mongoIdSchema } from "./shared.dto";

/**
 * Path parameters for analytics routes with solarUnitId
 */
export const AnalyticsSolarUnitParamDto = z.object({
  solarUnitId: mongoIdSchema,
});

/**
 * Query parameters for GET /api/analytics/weather-performance/:solarUnitId
 */
export const WeatherPerformanceQueryDto = z.object({
  days: z
    .string()
    .optional()
    .default("7")
    .transform((val) => Number.parseInt(val, 10))
    .pipe(z.number().min(1).max(30)),
});

/**
 * Query parameters for GET /api/analytics/anomaly-distribution/:solarUnitId
 */
export const AnomalyDistributionQueryDto = z.object({
  days: z
    .string()
    .optional()
    .default("30")
    .transform((val) => Number.parseInt(val, 10))
    .pipe(z.number().min(1).max(90)),
});

/**
 * Query parameters for GET /api/analytics/system-health/:solarUnitId
 */
export const SystemHealthQueryDto = z.object({
  days: z
    .string()
    .optional()
    .default("7")
    .transform((val) => Number.parseInt(val, 10))
    .pipe(z.number().min(1).max(30)),
});

/**
 * Query parameters for GET /api/analytics/peak-distribution/:solarUnitId
 */
export const PeakDistributionQueryDto = z.object({
  days: z
    .string()
    .optional()
    .default("14")
    .transform((val) => Number.parseInt(val, 10))
    .pipe(z.number().min(3).max(60)),
});
