import { Anomaly } from "../infrastructure/entities/Anomaly";
import { SolarUnit } from "../infrastructure/entities/SolarUnit";
import { User } from "../infrastructure/entities/User";
import { EnergyGenerationRecord } from "../infrastructure/entities/EnergyGenerationRecord";
import { NotFoundError, ForbiddenError, ValidationError } from "../domain/errors/errors";
import { getAuth } from "@clerk/express";
import { Request, Response, NextFunction } from "express";
import type { Types } from "mongoose";
import {
  GetUserAnomaliesQueryDto,
  GetAllAnomaliesQueryDto,
  AnomalyIdParamDto,
  ResolveAnomalyDto,
} from "../domain/dtos/anomaly.dto";

type LeanSolarUnit = {
  _id: Types.ObjectId;
  serialNumber?: string;
  capacity?: number;
};

type AggregateCount = { _id: string; count: number };

/**
 * Validator for GET /api/anomalies/me query parameters
 */
export const getUserAnomaliesValidator = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const result = GetUserAnomaliesQueryDto.safeParse(req.query);
  if (!result.success) {
    throw new ValidationError(result.error.message);
  }
  next();
};

/**
 * Validator for GET /api/anomalies query parameters (admin)
 */
export const getAllAnomaliesValidator = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const result = GetAllAnomaliesQueryDto.safeParse(req.query);
  if (!result.success) {
    throw new ValidationError(result.error.message);
  }
  next();
};

/**
 * Validator for anomaly ID in URL params
 */
export const anomalyIdParamValidator = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const result = AnomalyIdParamDto.safeParse(req.params);
  if (!result.success) {
    throw new ValidationError(result.error.message);
  }
  next();
};

/**
 * Validator for PATCH /api/anomalies/:id/resolve body
 */
export const resolveAnomalyValidator = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const result = ResolveAnomalyDto.safeParse(req.body);
  if (!result.success) {
    throw new ValidationError(result.error.message);
  }
  next();
};

/**
 * GET /api/anomalies/me handler
 */
export const getUserAnomaliesHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const auth = getAuth(req);
    const result = await getUserAnomalies(auth.userId!, req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/anomalies handler (admin)
 */
export const getAllAnomaliesHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await getAllAnomalies(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/anomalies/stats handler
 */
export const getAnomalyStatsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const auth = getAuth(req);
    console.log('[DEBUG] Clerk User ID from auth:', auth.userId);
    const stats = await getAnomalyStats(auth.userId!);
    res.json(stats);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/anomalies/:id/acknowledge handler
 */
export const acknowledgeAnomalyHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const auth = getAuth(req);
    const anomaly = await acknowledgeAnomaly(req.params.id, auth.userId!);
    res.json(anomaly);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/anomalies/:id/resolve handler
 */
export const resolveAnomalyHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
};

/**
 * POST /api/anomalies/trigger-detection handler
 */
export const triggerDetectionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("[Manual Trigger] Starting anomaly detection...");
    const { runAnomalyDetectionForAllUnits } = await import("./anomaly-detection");
    const result = await runAnomalyDetectionForAllUnits();
    res.json({
      success: true,
      message: "Anomaly detection completed",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/anomalies/trigger-sync handler
 */
export const triggerSyncHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("[Manual Trigger] Starting data sync...");
    const { syncEnergyGenerationRecords } = await import("./background/sync-energy-generation-records");
    await syncEnergyGenerationRecords();
    res.json({
      success: true,
      message: "Data sync completed",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/anomalies/debug handler
 */
export const getDebugInfo = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
};

/**
 * Get anomalies for the current user's solar units
 */
export async function getUserAnomalies(userId: string, query: any) {
  try {
    // Find user's solar units
    const user = await User.findOne({ clerkUserId: userId });
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const solarUnits = await SolarUnit.find({ userId: user._id })
      .select("_id serialNumber capacity")
      .lean<LeanSolarUnit[]>();
    const solarUnitIds = solarUnits.map((unit) => unit._id);

    // Build query filters
    const filter: any = { solarUnitId: { $in: solarUnitIds } };

    if (query.type) {
      filter.type = query.type;
    }
    if (query.severity) {
      filter.severity = query.severity;
    }
    if (query.status) {
      filter.status = query.status;
    }
    if (query.startDate || query.endDate) {
      filter.detectedAt = {};
      if (query.startDate) {
        filter.detectedAt.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        filter.detectedAt.$lte = new Date(query.endDate);
      }
    }

    // Pagination
    const limit = parseInt(query.limit) || 50;
    const offset = parseInt(query.offset) || 0;

    const anomalies = await Anomaly.find(filter)
      .sort({ detectedAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate("solarUnitId", "serialNumber capacity")
      .populate("acknowledgedBy", "firstName lastName email")
      .lean();

    const total = await Anomaly.countDocuments(filter);

    return {
      anomalies,
      total,
      limit,
      offset,
      hasMore: offset + anomalies.length < total,
    };
  } catch (error) {
    console.error("Error getting user anomalies:", error);
    throw error;
  }
}

/**
 * Get all anomalies (admin only)
 */
export async function getAllAnomalies(query: any) {
  try {
    // Build query filters
    const filter: any = {};

    if (query.type) {
      filter.type = query.type;
    }
    if (query.severity) {
      filter.severity = query.severity;
    }
    if (query.status) {
      filter.status = query.status;
    }
    if (query.solarUnitId) {
      filter.solarUnitId = query.solarUnitId;
    }
    if (query.startDate || query.endDate) {
      filter.detectedAt = {};
      if (query.startDate) {
        filter.detectedAt.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        filter.detectedAt.$lte = new Date(query.endDate);
      }
    }

    // Pagination
    const limit = parseInt(query.limit) || 50;
    const offset = parseInt(query.offset) || 0;

    const anomalies = await Anomaly.find(filter)
      .sort({ detectedAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate("solarUnitId", "serialNumber capacity")
      .populate("acknowledgedBy", "firstName lastName email")
      .lean();

    const total = await Anomaly.countDocuments(filter);

    return {
      anomalies,
      total,
      limit,
      offset,
      hasMore: offset + anomalies.length < total,
    };
  } catch (error) {
    console.error("Error getting all anomalies:", error);
    throw error;
  }
}

/**
 * Get anomaly statistics for the user's solar units
 */
export async function getAnomalyStats(userId: string) {
  try {
    // Find user's solar units
    const user = await User.findOne({ clerkUserId: userId });
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const solarUnits = await SolarUnit.find({ userId: user._id })
      .select("_id serialNumber capacity")
      .lean<LeanSolarUnit[]>();
    const solarUnitIds = solarUnits.map((unit) => unit._id);

    // Get counts by status
    const statusCounts = await Anomaly.aggregate<AggregateCount>([
      { $match: { solarUnitId: { $in: solarUnitIds } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    // Get counts by severity
    const severityCounts = await Anomaly.aggregate<AggregateCount>([
      { $match: { solarUnitId: { $in: solarUnitIds } } },
      { $group: { _id: "$severity", count: { $sum: 1 } } },
    ]);

    // Get counts by type
    const typeCounts = await Anomaly.aggregate<AggregateCount>([
      { $match: { solarUnitId: { $in: solarUnitIds } } },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]);

    // Get recent anomalies (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentCount = await Anomaly.countDocuments({
      solarUnitId: { $in: solarUnitIds },
      detectedAt: { $gte: sevenDaysAgo },
    });

    return {
      byStatus: statusCounts.reduce<Record<string, number>>((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      bySeverity: severityCounts.reduce<Record<string, number>>((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      byType: typeCounts.reduce<Record<string, number>>((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      recentCount,
      totalCount: await Anomaly.countDocuments({
        solarUnitId: { $in: solarUnitIds },
      }),
    };
  } catch (error) {
    console.error("Error getting anomaly stats:", error);
    throw error;
  }
}

/**
 * Acknowledge an anomaly
 */
export async function acknowledgeAnomaly(anomalyId: string, userId: string) {
  try {
    const anomaly = await Anomaly.findById(anomalyId);
    if (!anomaly) {
      throw new NotFoundError("Anomaly not found");
    }

    // Verify user has access to this anomaly
    const user = await User.findOne({ clerkUserId: userId });
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const solarUnit = await SolarUnit.findById(anomaly.solarUnitId);
    if (!solarUnit) {
      throw new NotFoundError("Solar unit not found");
    }

    // Check if user owns this solar unit or is admin
    if (
      solarUnit.userId?.toString() !== user._id.toString() &&
      user.role !== "admin"
    ) {
      throw new ForbiddenError(
        "You don't have permission to acknowledge this anomaly"
      );
    }

    // Update anomaly
    anomaly.status = "ACKNOWLEDGED";
    anomaly.acknowledgedAt = new Date();
    anomaly.acknowledgedBy = user._id;
    await anomaly.save();

    return anomaly;
  } catch (error) {
    console.error("Error acknowledging anomaly:", error);
    throw error;
  }
}

/**
 * Resolve an anomaly
 */
export async function resolveAnomaly(
  anomalyId: string,
  userId: string,
  resolutionNotes?: string
) {
  try {
    const anomaly = await Anomaly.findById(anomalyId);
    if (!anomaly) {
      throw new NotFoundError("Anomaly not found");
    }

    // Verify user has access to this anomaly
    const user = await User.findOne({ clerkUserId: userId });
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const solarUnit = await SolarUnit.findById(anomaly.solarUnitId);
    if (!solarUnit) {
      throw new NotFoundError("Solar unit not found");
    }

    // Check if user owns this solar unit or is admin
    if (
      solarUnit.userId?.toString() !== user._id.toString() &&
      user.role !== "admin"
    ) {
      throw new ForbiddenError(
        "You don't have permission to resolve this anomaly"
      );
    }

    // Update anomaly
    anomaly.status = "RESOLVED";
    anomaly.resolvedAt = new Date();
    anomaly.resolutionNotes = resolutionNotes || "";
    await anomaly.save();

    return anomaly;
  } catch (error) {
    console.error("Error resolving anomaly:", error);
    throw error;
  }
}
