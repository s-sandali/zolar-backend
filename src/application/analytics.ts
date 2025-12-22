import { SolarUnit } from "../infrastructure/entities/SolarUnit";
import { EnergyGenerationRecord } from "../infrastructure/entities/EnergyGenerationRecord";
import { Anomaly } from "../infrastructure/entities/Anomaly";
import { NotFoundError, ValidationError } from "../domain/errors/errors";
import { calculateSolarImpact } from "./weather";
import { Request, Response, NextFunction } from "express";
import {
  AnalyticsSolarUnitParamDto,
  WeatherPerformanceQueryDto,
  AnomalyDistributionQueryDto,
  SystemHealthQueryDto,
} from "../domain/dtos/analytics.dto";

/**
 * Validator for solar unit ID in analytics URL params
 */
export const analyticsSolarUnitParamValidator = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const result = AnalyticsSolarUnitParamDto.safeParse(req.params);
  if (!result.success) {
    throw new ValidationError(result.error.message);
  }
  next();
};

/**
 * Validator for GET /api/analytics/weather-performance/:id query
 */
export const weatherPerformanceQueryValidator = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const result = WeatherPerformanceQueryDto.safeParse(req.query);
  if (!result.success) {
    throw new ValidationError(result.error.message);
  }
  next();
};

/**
 * Validator for GET /api/analytics/anomaly-distribution/:id query
 */
export const anomalyDistributionQueryValidator = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const result = AnomalyDistributionQueryDto.safeParse(req.query);
  if (!result.success) {
    throw new ValidationError(result.error.message);
  }
  next();
};

/**
 * Validator for GET /api/analytics/system-health/:id query
 */
export const systemHealthQueryValidator = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const result = SystemHealthQueryDto.safeParse(req.query);
  if (!result.success) {
    throw new ValidationError(result.error.message);
  }
  next();
};

type LeanEnergyRecord = {
  timestamp: Date;
  energyGenerated?: number;
  energy?: number;
  intervalHours?: number;
  cloudCover?: number;
  precipitation?: number;
  temperature?: number;
  solarIrradiance?: number;
  windSpeed?: number;
};

type LeanAnomaly = {
  type: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "FALSE_POSITIVE";
  detectedAt: Date;
  resolvedAt?: Date | null;
};

interface DailyPerformanceData {
  date: string;
  actualEnergy: number;
  expectedEnergy: number;
  performanceRatio: number;
  weatherScore: number;
  cloudCover: number;
  precipitation: number;
  temperature: number;
}

export interface WeatherAdjustedPerformanceResponse {
  solarUnitId: string;
  capacity: number;
  dailyData: DailyPerformanceData[];
  summary: {
    avgPerformanceRatio: number;
    totalActualEnergy: number;
    totalExpectedEnergy: number;
    bestDay: { date: string; ratio: number };
    worstDay: { date: string; ratio: number };
  };
}

/**
 * Calculate expected energy based on weather conditions
 * Formula: Expected = Capacity × Hours × Weather Impact Factor
 */
function calculateExpectedEnergy(
  capacityKw: number,
  weatherScore: number,
  hoursInPeriod: number = 24
): number {
  // Convert weather score (0-100) to efficiency factor (0-1)
  const weatherFactor = weatherScore / 100;

  // Assume solar panels operate at peak for ~5-6 hours equivalent per day
  // in optimal conditions (weather score = 100)
  const peakHoursEquivalent = 5.5;

  // Calculate expected energy in kWh
  const expectedEnergy = capacityKw * peakHoursEquivalent * weatherFactor;

  return Math.round(expectedEnergy * 100) / 100; // Round to 2 decimal places
}

/**
 * GET /api/analytics/weather-performance/:solarUnitId handler
 */
export const getWeatherPerformance = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { solarUnitId } = req.params;
    const days = parseInt(req.query.days as string) || 7;

    const analytics = await getWeatherAdjustedPerformance(solarUnitId, days);

    res.json(analytics);
  } catch (error) {
    next(error);
  }
};

/**
 * Get weather-adjusted performance analytics for a solar unit
 */
export async function getWeatherAdjustedPerformance(
  solarUnitId: string,
  days: number = 7
): Promise<WeatherAdjustedPerformanceResponse> {
  // Find the solar unit
  const solarUnit = await SolarUnit.findById(solarUnitId);
  if (!solarUnit) {
    throw new NotFoundError("Solar unit not found");
  }

  // Calculate date range (last N days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  // Fetch energy generation records for the period
  const energyRecords = await EnergyGenerationRecord.find({
    solarUnitId: solarUnit._id,
    timestamp: { $gte: startDate, $lte: endDate },
  })
    .sort({ timestamp: 1 })
    .lean<LeanEnergyRecord[]>();

  // Group records by day and aggregate
  const dailyDataMap = new Map<string, {
    actualEnergy: number;
    records: LeanEnergyRecord[];
  }>();

  energyRecords.forEach((record) => {
  const dateKey = new Date(record.timestamp).toISOString().split('T')[0];

  if (!dailyDataMap.has(dateKey)) {
    dailyDataMap.set(dateKey, { actualEnergy: 0, records: [] });
  }

  const dayData = dailyDataMap.get(dateKey)!;
  const energyValue = record.energy ?? record.energyGenerated ?? 0;

  dayData.actualEnergy += energyValue;
  dayData.records.push(record);
});

  // Calculate performance for each day
  const dailyData: DailyPerformanceData[] = [];

  for (const [date, data] of dailyDataMap.entries()) {
    // Get average weather conditions for the day
    let totalCloudCover = 0;
    let totalPrecipitation = 0;
    let totalTemp = 0;
    let totalIrradiance = 0;
    let totalWindSpeed = 0;
    let count = 0;

    data.records.forEach((record) => {
  if (record.cloudCover !== undefined) totalCloudCover += record.cloudCover;
  if (record.precipitation !== undefined) totalPrecipitation += record.precipitation;
  if (record.temperature !== undefined) totalTemp += record.temperature;
  if (record.solarIrradiance !== undefined) totalIrradiance += record.solarIrradiance;
  if (record.windSpeed !== undefined) totalWindSpeed += record.windSpeed;
  count++;
});


    const avgCloudCover = count > 0 ? totalCloudCover / count : 50; // Default to moderate
    const avgPrecipitation = count > 0 ? totalPrecipitation / count : 0;
    const avgTemp = count > 0 ? totalTemp / count : 25; // Default to 25°C
    const avgIrradiance = count > 0 ? totalIrradiance / count : 500; // Default to moderate
    const avgWindSpeed = count > 0 ? totalWindSpeed / count : 10; // Default to 10 km/h

    // Calculate weather impact score for the day
    const { score: weatherScore } = calculateSolarImpact(
      avgCloudCover,
      avgPrecipitation,
      avgIrradiance,
      avgTemp,
      avgWindSpeed
    );

    // Calculate expected energy based on weather
    const capacityKw = solarUnit.capacity / 1000; // Convert W to kW
    const expectedEnergy = calculateExpectedEnergy(capacityKw, weatherScore);

    // Calculate performance ratio
    const performanceRatio = expectedEnergy > 0
      ? Math.round((data.actualEnergy / expectedEnergy) * 100)
      : 0;

    dailyData.push({
      date,
      actualEnergy: Math.round(data.actualEnergy * 100) / 100,
      expectedEnergy,
      performanceRatio,
      weatherScore: Math.round(weatherScore),
      cloudCover: Math.round(avgCloudCover),
      precipitation: Math.round(avgPrecipitation * 10) / 10,
      temperature: Math.round(avgTemp * 10) / 10,
    });
  }

  // Sort by date
  dailyData.sort((a, b) => a.date.localeCompare(b.date));

  // Calculate summary statistics
  const totalActualEnergy = dailyData.reduce((sum, day) => sum + day.actualEnergy, 0);
  const totalExpectedEnergy = dailyData.reduce((sum, day) => sum + day.expectedEnergy, 0);
  const avgPerformanceRatio = dailyData.length > 0
    ? Math.round(dailyData.reduce((sum, day) => sum + day.performanceRatio, 0) / dailyData.length)
    : 0;

  const bestDay = dailyData.reduce((best, day) =>
    day.performanceRatio > best.ratio ? { date: day.date, ratio: day.performanceRatio } : best,
    { date: '', ratio: 0 }
  );

  const worstDay = dailyData.reduce((worst, day) =>
    day.performanceRatio < worst.ratio ? { date: day.date, ratio: day.performanceRatio } : worst,
    { date: '', ratio: Infinity }
  );

  return {
    solarUnitId: solarUnit._id.toString(),
    capacity: solarUnit.capacity,
    dailyData,
    summary: {
      avgPerformanceRatio,
      totalActualEnergy: Math.round(totalActualEnergy * 100) / 100,
      totalExpectedEnergy: Math.round(totalExpectedEnergy * 100) / 100,
      bestDay: worstDay.ratio === Infinity ? { date: '', ratio: 0 } : bestDay,
      worstDay: worstDay.ratio === Infinity ? { date: '', ratio: 0 } : worstDay,
    },
  };
}

/**
 * GET /api/analytics/anomaly-distribution/:solarUnitId handler
 */
export const getAnomalyDistributionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { solarUnitId } = req.params;
    const days = Number.parseInt(req.query.days as string) || 30;

    const analytics = await getAnomalyDistribution(solarUnitId, days);

    res.json(analytics);
  } catch (error) {
    next(error);
  }
};

/**
 * Get anomaly distribution analytics
 */
export interface AnomalyDistributionResponse {
  solarUnitId: string;
  totalAnomalies: number;
  byType: Array<{ type: string; count: number; percentage: number }>;
  bySeverity: Array<{ severity: string; count: number; percentage: number }>;
  byStatus: Array<{ status: string; count: number; percentage: number }>;
  recentTrend: Array<{ date: string; count: number }>;
}

export async function getAnomalyDistribution(
  solarUnitId: string,
  days: number = 30
): Promise<AnomalyDistributionResponse> {
  const solarUnit = await SolarUnit.findById(solarUnitId);
  if (!solarUnit) {
    throw new NotFoundError("Solar unit not found");
  }

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Fetch anomalies for the period
  const anomalies = await Anomaly.find({
    solarUnitId: solarUnit._id,
    detectedAt: { $gte: startDate, $lte: endDate },
  })
    .lean<LeanAnomaly[]>();

  const totalAnomalies = anomalies.length;

  // Group by type
  const typeMap = new Map<string, number>();
  const severityMap = new Map<string, number>();
  const statusMap = new Map<string, number>();

  anomalies.forEach((anomaly) => {
    // By type
    const currentTypeCount = typeMap.get(anomaly.type) || 0;
    typeMap.set(anomaly.type, currentTypeCount + 1);

    // By severity
    const currentSeverityCount = severityMap.get(anomaly.severity) || 0;
    severityMap.set(anomaly.severity, currentSeverityCount + 1);

    // By status
    const currentStatusCount = statusMap.get(anomaly.status) || 0;
    statusMap.set(anomaly.status, currentStatusCount + 1);
  });

  // Convert to arrays with percentages
  const byType = Array.from(typeMap.entries()).map(([type, count]) => ({
    type,
    count,
    percentage: totalAnomalies > 0 ? Math.round((count / totalAnomalies) * 100) : 0,
  }));

  const bySeverity = Array.from(severityMap.entries()).map(([severity, count]) => ({
    severity,
    count,
    percentage: totalAnomalies > 0 ? Math.round((count / totalAnomalies) * 100) : 0,
  }));

  const byStatus = Array.from(statusMap.entries()).map(([status, count]) => ({
    status,
    count,
    percentage: totalAnomalies > 0 ? Math.round((count / totalAnomalies) * 100) : 0,
  }));

  // Recent trend (daily anomaly count)
  const trendMap = new Map<string, number>();
  anomalies.forEach((anomaly) => {
    const dateKey = new Date(anomaly.detectedAt).toISOString().split('T')[0];
    const currentCount = trendMap.get(dateKey) || 0;
    trendMap.set(dateKey, currentCount + 1);
  });

  const recentTrend = Array.from(trendMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    solarUnitId: solarUnit._id.toString(),
    totalAnomalies,
    byType,
    bySeverity,
    byStatus,
    recentTrend,
  };
}

/**
 * GET /api/analytics/system-health/:solarUnitId handler
 */
export const getSystemHealthHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { solarUnitId } = req.params;
    const days = Number.parseInt(req.query.days as string) || 7;

    const analytics = await getSystemHealth(solarUnitId, days);

    res.json(analytics);
  } catch (error) {
    next(error);
  }
};

/**
 * Get system health score
 */
export interface SystemHealthResponse {
  solarUnitId: string;
  healthScore: number; // 0-100
  rating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  factors: {
    anomalyImpact: number; // 0-100 (lower anomalies = higher score)
    performanceImpact: number; // 0-100
    uptimeImpact: number; // 0-100
    resolutionEfficiency: number; // 0-100
  };
  recommendations: string[];
}

export async function getSystemHealth(
  solarUnitId: string,
  days: number = 7
): Promise<SystemHealthResponse> {
  const solarUnit = await SolarUnit.findById(solarUnitId);
  if (!solarUnit) {
    throw new NotFoundError("Solar unit not found");
  }

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Fetch anomalies
  const anomalies = await Anomaly.find({
    solarUnitId: solarUnit._id,
    detectedAt: { $gte: startDate, $lte: endDate },
  })
    .lean<LeanAnomaly[]>();

  // Factor 1: Anomaly Impact (fewer anomalies = better)
  const criticalCount = anomalies.filter(a => a.severity === 'CRITICAL').length;
  const warningCount = anomalies.filter(a => a.severity === 'WARNING').length;
  const anomalyScore = Math.max(0, 100 - (criticalCount * 10) - (warningCount * 5));

  // Factor 2: Performance (from weather-adjusted performance)
  let performanceScore = 75; // Default
  try {
    const performance = await getWeatherAdjustedPerformance(solarUnitId, days);
    performanceScore = performance.summary.avgPerformanceRatio;
  } catch (error) {
    // If no performance data, use default
  }

  // Factor 3: Uptime (days without CRITICAL anomalies)
  const daysWithCritical = new Set<string>();
  anomalies
    .filter(a => a.severity === 'CRITICAL')
    .forEach(a => {
      const dateKey = new Date(a.detectedAt).toISOString().split('T')[0];
      daysWithCritical.add(dateKey);
    });
  const uptimePercentage = ((days - daysWithCritical.size) / days) * 100;

  // Factor 4: Resolution Efficiency (how quickly anomalies are resolved)
  const resolvedAnomalies = anomalies.filter(a => a.status === 'RESOLVED');
  let avgResolutionTime = 0;
  if (resolvedAnomalies.length > 0) {
    const totalResolutionTime = resolvedAnomalies.reduce((sum, a) => {
      if (a.resolvedAt && a.detectedAt) {
        const diff = a.resolvedAt.getTime() - a.detectedAt.getTime();
        return sum + diff;
      }
      return sum;
    }, 0);
    avgResolutionTime = totalResolutionTime / resolvedAnomalies.length / (1000 * 60 * 60); // hours
  }
  // Score based on resolution time (< 24h = 100, > 7 days = 0)
  const resolutionScore = avgResolutionTime === 0 ? 100 : Math.max(0, 100 - (avgResolutionTime / 24) * 10);

  // Calculate overall health score (weighted average)
  const healthScore = Math.round(
    anomalyScore * 0.3 +
    performanceScore * 0.4 +
    uptimePercentage * 0.2 +
    resolutionScore * 0.1
  );

  // Determine rating
  let rating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  if (healthScore >= 85) rating = 'Excellent';
  else if (healthScore >= 70) rating = 'Good';
  else if (healthScore >= 50) rating = 'Fair';
  else rating = 'Poor';

  // Generate recommendations
  const recommendations: string[] = [];
  if (criticalCount > 0) {
    recommendations.push(`Address ${criticalCount} critical anomal${criticalCount > 1 ? 'ies' : 'y'} immediately`);
  }
  if (performanceScore < 70) {
    recommendations.push('Performance is below expectations - check for panel obstructions');
  }
  if (uptimePercentage < 80) {
    recommendations.push('System uptime is low - schedule maintenance');
  }
  if (avgResolutionTime > 48) {
    recommendations.push('Improve anomaly resolution time for better system health');
  }
  if (recommendations.length === 0) {
    recommendations.push('System is operating optimally - continue monitoring');
  }

  return {
    solarUnitId: solarUnit._id.toString(),
    healthScore,
    rating,
    factors: {
      anomalyImpact: Math.round(anomalyScore),
      performanceImpact: Math.round(performanceScore),
      uptimeImpact: Math.round(uptimePercentage),
      resolutionEfficiency: Math.round(resolutionScore),
    },
    recommendations,
  };
}
