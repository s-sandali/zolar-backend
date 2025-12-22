import express from "express";
import {
  getWeatherPerformance,
  getAnomalyDistributionHandler,
  getSystemHealthHandler,
  analyticsSolarUnitParamValidator,
  weatherPerformanceQueryValidator,
  anomalyDistributionQueryValidator,
  systemHealthQueryValidator,
} from "../application/analytics";
import { authenticationMiddleware } from "./middlewares/authentication-middleware";

const analyticsRouter = express.Router();

/**Get weather-adjusted performance analytics for a solar unit, Requires authentication
 * Query params: days: number of days to analyze (default: 7, max: 30)
 */
analyticsRouter.get("/weather-performance/:solarUnitId",authenticationMiddleware, analyticsSolarUnitParamValidator,weatherPerformanceQueryValidator, getWeatherPerformance);

/** Get anomaly distribution analytics Requires authentication,Query params:- days: number of days to analyze (default: 30, max: 90)
 */
analyticsRouter.get( "/anomaly-distribution/:solarUnitId", authenticationMiddleware, analyticsSolarUnitParamValidator,anomalyDistributionQueryValidator,getAnomalyDistributionHandler);

/** Get system health score and factors,Requires authentication,Query params:- days: number of days to analyze (default: 7, max: 30)
 */
analyticsRouter.get("/system-health/:solarUnitId",authenticationMiddleware,analyticsSolarUnitParamValidator, systemHealthQueryValidator, getSystemHealthHandler);

export default analyticsRouter;
