import express from "express";
import { authenticationMiddleware } from "./middlewares/authentication-middleware";
import { authorizationMiddleware } from "./middlewares/authorization-middleware";
import {
  getUserAnomaliesHandler,
  getAllAnomaliesHandler,
  acknowledgeAnomalyHandler,
  resolveAnomalyHandler,
  getAnomalyStatsHandler,
  getUserAnomaliesValidator,
  getAllAnomaliesValidator,
  anomalyIdParamValidator,
  resolveAnomalyValidator,
  getDebugInfo,
} from "../application/anomalies";
import { runAnomalyDetectionForAllUnits } from "../application/anomaly-detection";
import { syncEnergyGenerationRecords } from "../application/background/sync-energy-generation-records";

const anomaliesRouter = express.Router();

/**
 * GET /api/anomalies/me
 * Get anomalies for user's solar unit(s)
 * Requires authentication
 */
anomaliesRouter.get(
  "/me",
  authenticationMiddleware,
  getUserAnomaliesValidator,
  getUserAnomaliesHandler
);

/**
 * GET /api/anomalies
 * Get all anomalies (admin only)
 * Requires authentication and admin role
 */
anomaliesRouter.get(
  "/",
  authenticationMiddleware,
  authorizationMiddleware,
  getAllAnomaliesValidator,
  getAllAnomaliesHandler
);

/**
 * GET /api/anomalies/stats
 * Get anomaly statistics for user's solar units
 * Requires authentication
 */
anomaliesRouter.get(
  "/stats",
  authenticationMiddleware,
  getAnomalyStatsHandler
);

/**
 * PATCH /api/anomalies/:id/acknowledge
 * Acknowledge an anomaly
 * Requires authentication
 */
anomaliesRouter.patch(
  "/:id/acknowledge",
  authenticationMiddleware,
  anomalyIdParamValidator,
  acknowledgeAnomalyHandler
);

/**
 * PATCH /api/anomalies/:id/resolve
 * Resolve an anomaly with optional notes
 * Requires authentication
 */
anomaliesRouter.patch(
  "/:id/resolve",
  authenticationMiddleware,
  anomalyIdParamValidator,
  resolveAnomalyValidator,
  resolveAnomalyHandler
);

/**
 * POST /api/anomalies/trigger-detection
 * Manually trigger anomaly detection for all units (for testing)
 * Requires authentication
 */
anomaliesRouter.post(
  "/trigger-detection",
  authenticationMiddleware,
  async (req, res, next) => {
    try {
      console.log("[Manual Trigger] Starting anomaly detection...");
      const result = await runAnomalyDetectionForAllUnits();
      res.json({
        success: true,
        message: "Anomaly detection completed",
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/anomalies/trigger-sync
 * Manually trigger data sync from data-api (for testing)
 * Requires authentication
 */
anomaliesRouter.post(
  "/trigger-sync",
  authenticationMiddleware,
  async (req, res, next) => {
    try {
      console.log("[Manual Trigger] Starting data sync...");
      await syncEnergyGenerationRecords();
      res.json({
        success: true,
        message: "Data sync completed",
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/anomalies/debug
 * Debug endpoint to check data status
 * Requires authentication
 */
anomaliesRouter.get(
  "/debug",
  authenticationMiddleware,
  getDebugInfo
);

export default anomaliesRouter;
