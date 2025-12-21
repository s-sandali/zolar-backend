import express from "express";
import {
  getWeatherAdjustedPerformance,
  getAnomalyDistribution,
  getSystemHealth
} from "../application/analytics";
import { authenticationMiddleware } from "./middlewares/authentication-middleware";

const analyticsRouter = express.Router();

/**
 * GET /api/analytics/weather-performance/:solarUnitId
 * Get weather-adjusted performance analytics for a solar unit
 * Requires authentication
 * Query params:
 *   - days: number of days to analyze (default: 7, max: 30)
 */
analyticsRouter.get(
  "/weather-performance/:solarUnitId",
  authenticationMiddleware,
  async (req, res, next) => {
    try {
      const { solarUnitId } = req.params;
      const days = Math.min(
        parseInt(req.query.days as string) || 7,
        30 // Maximum 30 days
      );

      const analytics = await getWeatherAdjustedPerformance(solarUnitId, days);

      res.json(analytics);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/analytics/anomaly-distribution/:solarUnitId
 * Get anomaly distribution analytics
 * Requires authentication
 * Query params:
 *   - days: number of days to analyze (default: 30, max: 90)
 */
analyticsRouter.get(
  "/anomaly-distribution/:solarUnitId",
  authenticationMiddleware,
  async (req, res, next) => {
    try {
      const { solarUnitId } = req.params;
      const days = Math.min(
        parseInt(req.query.days as string) || 30,
        90 // Maximum 90 days
      );

      const analytics = await getAnomalyDistribution(solarUnitId, days);

      res.json(analytics);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/analytics/system-health/:solarUnitId
 * Get system health score and factors
 * Requires authentication
 * Query params:
 *   - days: number of days to analyze (default: 7, max: 30)
 */
analyticsRouter.get(
  "/system-health/:solarUnitId",
  authenticationMiddleware,
  async (req, res, next) => {
    try {
      const { solarUnitId } = req.params;
      const days = Math.min(
        parseInt(req.query.days as string) || 7,
        30 // Maximum 30 days
      );

      const analytics = await getSystemHealth(solarUnitId, days);

      res.json(analytics);
    } catch (error) {
      next(error);
    }
  }
);

export default analyticsRouter;
