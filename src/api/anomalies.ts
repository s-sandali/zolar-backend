import express from "express";
import { getAuth } from "@clerk/express";
import { authenticationMiddleware } from "./middlewares/authentication-middleware";
import { authorizationMiddleware } from "./middlewares/authorization-middleware";
import {
  getUserAnomalies,
  getAllAnomalies,
  acknowledgeAnomaly,
  resolveAnomaly,
  getAnomalyStats,
} from "../application/anomalies";
import { runAnomalyDetectionForAllUnits } from "../application/anomaly-detection";
import { syncEnergyGenerationRecords } from "../application/background/sync-energy-generation-records";
import { EnergyGenerationRecord } from "../infrastructure/entities/EnergyGenerationRecord";
import { SolarUnit } from "../infrastructure/entities/SolarUnit";

const anomaliesRouter = express.Router();

/**
 * GET /api/anomalies/me
 * Get anomalies for user's solar unit(s)
 * Requires authentication
 */
anomaliesRouter.get("/me", authenticationMiddleware, async (req, res, next) => {
  try {
    const auth = getAuth(req);
    const result = await getUserAnomalies(auth.userId!, req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/anomalies
 * Get all anomalies (admin only)
 * Requires authentication and admin role
 */
anomaliesRouter.get(
  "/",
  authenticationMiddleware,
  authorizationMiddleware,
  async (req, res, next) => {
    try {
      const result = await getAllAnomalies(req.query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/anomalies/stats
 * Get anomaly statistics for user's solar units
 * Requires authentication
 */
anomaliesRouter.get(
  "/stats",
  authenticationMiddleware,
  async (req, res, next) => {
    try {
      const auth = getAuth(req);
      console.log('[DEBUG] Clerk User ID from auth:', auth.userId);
      const stats = await getAnomalyStats(auth.userId!);
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/anomalies/:id/acknowledge
 * Acknowledge an anomaly
 * Requires authentication
 */
anomaliesRouter.patch(
  "/:id/acknowledge",
  authenticationMiddleware,
  async (req, res, next) => {
    try {
      const auth = getAuth(req);
      const anomaly = await acknowledgeAnomaly(req.params.id, auth.userId!);
      res.json(anomaly);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/anomalies/:id/resolve
 * Resolve an anomaly with optional notes
 * Requires authentication
 */
anomaliesRouter.patch(
  "/:id/resolve",
  authenticationMiddleware,
  async (req, res, next) => {
    try {
      const auth = getAuth(req);
      const { resolutionNotes } = req.body;
      const anomaly = await resolveAnomaly(
        req.params.id,
        auth.userId!,
        resolutionNotes
      );
      res.json(anomaly);
    } catch (error) {
      next(error);
    }
  }
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
  async (req, res, next) => {
    try {
      const auth = getAuth(req);

      // Get solar units count
      const solarUnitsCount = await SolarUnit.countDocuments();
      const activeSolarUnits = await SolarUnit.countDocuments({ status: "ACTIVE" });

      // Get energy records count
      const energyRecordsCount = await EnergyGenerationRecord.countDocuments();

      // Get nighttime records (potential anomalies)
      const nighttimeRecords = await EnergyGenerationRecord.aggregate([
        {
          $addFields: {
            hour: { $hour: "$timestamp" }
          }
        },
        {
          $match: {
            $or: [
              { hour: { $gte: 18 } },
              { hour: { $lt: 6 } }
            ],
            energyGenerated: { $gt: 10 }
          }
        },
        {
          $count: "count"
        }
      ]);

      const nighttimeCount = nighttimeRecords[0]?.count || 0;

      // Sample nighttime record
      const sampleNighttimeRecord = await EnergyGenerationRecord.findOne({
        energyGenerated: { $gt: 10 }
      }).then(async (rec) => {
        if (rec) {
          const hour = rec.timestamp.getUTCHours();
          if (hour >= 18 || hour < 6) {
            return rec;
          }
        }
        return null;
      });

      res.json({
        solarUnits: {
          total: solarUnitsCount,
          active: activeSolarUnits,
        },
        energyRecords: {
          total: energyRecordsCount,
          nighttimeAnomalies: nighttimeCount,
        },
        sampleNighttimeRecord,
        status: energyRecordsCount === 0
          ? "NO_DATA - Run sync first!"
          : nighttimeCount === 0
          ? "NO_ANOMALIES - Check if data has nighttime generation"
          : "DATA_READY - Run detection!",
      });
    } catch (error) {
      next(error);
    }
  }
);

export default anomaliesRouter;
