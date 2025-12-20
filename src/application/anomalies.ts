import { Anomaly } from "../infrastructure/entities/Anomaly";
import { SolarUnit } from "../infrastructure/entities/SolarUnit";
import { User } from "../infrastructure/entities/User";
import { NotFoundError, ForbiddenError } from "../domain/errors/errors";
import { getAuth } from "@clerk/express";
import { Request } from "express";

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

    const solarUnits = await SolarUnit.find({ userId: user._id });
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

    const solarUnits = await SolarUnit.find({ userId: user._id });
    const solarUnitIds = solarUnits.map((unit) => unit._id);

    // Get counts by status
    const statusCounts = await Anomaly.aggregate([
      { $match: { solarUnitId: { $in: solarUnitIds } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    // Get counts by severity
    const severityCounts = await Anomaly.aggregate([
      { $match: { solarUnitId: { $in: solarUnitIds } } },
      { $group: { _id: "$severity", count: { $sum: 1 } } },
    ]);

    // Get counts by type
    const typeCounts = await Anomaly.aggregate([
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
      byStatus: statusCounts.reduce(
        (acc, item) => {
          acc[item._id] = item.count;
          return acc;
        },
        {} as Record<string, number>
      ),
      bySeverity: severityCounts.reduce(
        (acc, item) => {
          acc[item._id] = item.count;
          return acc;
        },
        {} as Record<string, number>
      ),
      byType: typeCounts.reduce(
        (acc, item) => {
          acc[item._id] = item.count;
          return acc;
        },
        {} as Record<string, number>
      ),
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
