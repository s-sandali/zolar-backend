import { z } from "zod";
import { mongoIdSchema } from "./shared.dto";

/**
 * Path parameters for GET /api/weather/current/:solarUnitId
 */
export const WeatherSolarUnitParamDto = z.object({
  solarUnitId: mongoIdSchema,
});
