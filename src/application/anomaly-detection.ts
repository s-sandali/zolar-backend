import { EnergyGenerationRecord } from "../infrastructure/entities/EnergyGenerationRecord";
import { SolarUnit } from "../infrastructure/entities/SolarUnit";
import { Anomaly } from "../infrastructure/entities/Anomaly";

// Type definitions
export type AnomalyType =
  | "NIGHTTIME_GENERATION"
  | "ZERO_GENERATION_CLEAR_SKY"
  | "OVERPRODUCTION"
  | "HIGH_GENERATION_BAD_WEATHER"
  | "LOW_GENERATION_CLEAR_WEATHER"
  | "SUDDEN_PRODUCTION_DROP"
  | "ERRATIC_OUTPUT";

export type AnomalySeverity = "CRITICAL" | "WARNING" | "INFO";

export interface DetectedAnomaly {
  solarUnitId: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  affectedPeriod: {
    start: Date;
    end?: Date;
  };
  energyRecordIds: string[];
  description: string;
  metadata: {
    expectedValue?: number;
    actualValue?: number;
    deviation?: number;
    threshold?: string;
  };
}

/**
 * Anomaly Detector Class
 * Handles detection of various anomaly types in solar energy generation data
 */
export class AnomalyDetector {
  /**
   * Main detection orchestrator
   * Runs all detection algorithms for a specific solar unit
   */
  async detectAnomalies(solarUnitId: string): Promise<DetectedAnomaly[]> {
    const detectedAnomalies: DetectedAnomaly[] = [];

    try {
      // Run all detection algorithms
      const nighttimeAnomalies = await this.detectNighttimeGeneration(
        solarUnitId
      );
      detectedAnomalies.push(...nighttimeAnomalies);

      const zeroGenerationAnomalies = await this.detectZeroGenerationClearSky(
        solarUnitId
      );
      detectedAnomalies.push(...zeroGenerationAnomalies);

      const overproductionAnomalies = await this.detectOverproduction(
        solarUnitId
      );
      detectedAnomalies.push(...overproductionAnomalies);

      // Future: Add more detection methods here
      // detectedAnomalies.push(...await this.detectSuddenProductionDrop(solarUnitId));
      // etc.

      return detectedAnomalies;
    } catch (error) {
      console.error(
        `Error detecting anomalies for solar unit ${solarUnitId}:`,
        error
      );
      return detectedAnomalies;
    }
  }

  /**
   * Algorithm 1: Nighttime Generation Detection
   *
   * Detects solar panels generating energy during night hours (6pm - 6am UTC)
   * This indicates sensor malfunction or data integrity issues
   *
   * Severity: CRITICAL
   */
  async detectNighttimeGeneration(
    solarUnitId: string
  ): Promise<DetectedAnomaly[]> {
    const anomalies: DetectedAnomaly[] = [];

    try {
      // Get recent records (last 150 days to capture all test data from Aug 1)
      const lookbackDays = 150;
      const lookbackDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

      const recentRecords = await EnergyGenerationRecord.find({
        solarUnitId,
        timestamp: { $gte: lookbackDate },
      }).sort({ timestamp: -1 });

      console.log(
        `[Nighttime Detection] Checking ${recentRecords.length} records for solar unit ${solarUnitId}`
      );

      for (const record of recentRecords) {
        const hour = record.timestamp.getUTCHours();

        // Night hours: 7pm - 6am (19:00 - 06:00 UTC) - exclude 18:00 as it's still daylight
        const isNighttime = hour >= 19 || hour < 6;

        // Threshold: More than 10 Wh during night is abnormal
        if (isNighttime && record.energyGenerated > 10) {
          anomalies.push({
            solarUnitId,
            type: "NIGHTTIME_GENERATION",
            severity: "CRITICAL",
            affectedPeriod: {
              start: record.timestamp,
              end: record.timestamp,
            },
            energyRecordIds: [record._id.toString()],
            description: `Solar panel generated ${record.energyGenerated}Wh at ${hour}:00 UTC (night hours). This indicates a sensor malfunction or data error.`,
            metadata: {
              expectedValue: 0,
              actualValue: record.energyGenerated,
              deviation: 100,
              threshold: "Night hours: 18:00-06:00 UTC, expected 0 Wh",
            },
          });
        }
      }

      console.log(
        `[Nighttime Detection] Found ${anomalies.length} nighttime generation anomalies`
      );

      return anomalies;
    } catch (error) {
      console.error(
        `Error in detectNighttimeGeneration for ${solarUnitId}:`,
        error
      );
      return [];
    }
  }

  /**
   * Algorithm 2: Zero Generation on Clear Sky Days Detection
   *
   * Detects solar panels producing zero energy during peak daylight hours (10am-2pm UTC)
   * This indicates panel disconnection, inverter failure, or complete system outage
   *
   * Severity: CRITICAL
   */
  async detectZeroGenerationClearSky(
    solarUnitId: string
  ): Promise<DetectedAnomaly[]> {
    const anomalies: DetectedAnomaly[] = [];

    try {
      // Get recent records (last 150 days to capture all test data from Aug 1)
      const lookbackDays = 150;
      const lookbackDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

      const recentRecords = await EnergyGenerationRecord.find({
        solarUnitId,
        timestamp: { $gte: lookbackDate },
      }).sort({ timestamp: -1 });

      console.log(
        `[Zero Generation Detection] Checking ${recentRecords.length} records for solar unit ${solarUnitId}`
      );

      for (const record of recentRecords) {
        const hour = record.timestamp.getUTCHours();

        // Peak sun hours: 10am - 2pm (10:00 - 14:00 UTC)
        const isPeakHours = hour >= 10 && hour <= 14;

        // Threshold: 0 Wh during peak hours is abnormal (expected minimum ~100 Wh)
        if (isPeakHours && record.energyGenerated === 0) {
          anomalies.push({
            solarUnitId,
            type: "ZERO_GENERATION_CLEAR_SKY",
            severity: "CRITICAL",
            affectedPeriod: {
              start: record.timestamp,
              end: record.timestamp,
            },
            energyRecordIds: [record._id.toString()],
            description: `Solar panel generated 0Wh at ${hour}:00 UTC (peak sun hours). This indicates a complete system failure, panel disconnection, or inverter malfunction.`,
            metadata: {
              expectedValue: 200, // Expected minimum during peak hours
              actualValue: 0,
              deviation: 100,
              threshold: "Peak hours: 10:00-14:00 UTC, expected >100 Wh",
            },
          });
        }
      }

      console.log(
        `[Zero Generation Detection] Found ${anomalies.length} zero generation anomalies`
      );

      return anomalies;
    } catch (error) {
      console.error(
        `Error in detectZeroGenerationClearSky for ${solarUnitId}:`,
        error
      );
      return [];
    }
  }

  /**
   * Algorithm 3: Overproduction Detection
   *
   * Detects when solar panels generate more than 120% of their rated capacity
   * Rated capacity: 500W × 2 hours = 1000 Wh max per interval
   * Threshold: >1200 Wh indicates sensor malfunction or calibration error
   *
   * Severity: WARNING (not critical but needs attention)
   */
  async detectOverproduction(
    solarUnitId: string
  ): Promise<DetectedAnomaly[]> {
    const anomalies: DetectedAnomaly[] = [];

    try {
      // Get recent records (last 150 days to capture all test data from Aug 1)
      const lookbackDays = 150;
      const lookbackDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

      const recentRecords = await EnergyGenerationRecord.find({
        solarUnitId,
        timestamp: { $gte: lookbackDate },
      }).sort({ timestamp: -1 });

      console.log(
        `[Overproduction Detection] Checking ${recentRecords.length} records for solar unit ${solarUnitId}`
      );

      // Rated capacity: 500W × 2 hours = 1000 Wh
      // Threshold: 120% of rated capacity = 1200 Wh
      const MAX_CAPACITY = 1000;
      const OVERPRODUCTION_THRESHOLD = MAX_CAPACITY * 1.2; // 1200 Wh

      for (const record of recentRecords) {
        if (record.energyGenerated > OVERPRODUCTION_THRESHOLD) {
          const deviationPercent = Math.round(
            ((record.energyGenerated - MAX_CAPACITY) / MAX_CAPACITY) * 100
          );

          anomalies.push({
            solarUnitId,
            type: "OVERPRODUCTION",
            severity: "WARNING",
            affectedPeriod: {
              start: record.timestamp,
              end: record.timestamp,
            },
            energyRecordIds: [record._id.toString()],
            description: `Solar panel generated ${record.energyGenerated}Wh, which exceeds the rated capacity (1000 Wh max). This indicates a sensor malfunction, calibration error, or data anomaly.`,
            metadata: {
              expectedValue: MAX_CAPACITY,
              actualValue: record.energyGenerated,
              deviation: deviationPercent,
              threshold: `Maximum capacity: ${MAX_CAPACITY} Wh, threshold: ${OVERPRODUCTION_THRESHOLD} Wh (120%)`,
            },
          });
        }
      }

      console.log(
        `[Overproduction Detection] Found ${anomalies.length} overproduction anomalies`
      );

      return anomalies;
    } catch (error) {
      console.error(
        `Error in detectOverproduction for ${solarUnitId}:`,
        error
      );
      return [];
    }
  }

  /**
   * Save detected anomalies to database
   * Avoids duplicates by checking for existing anomalies in the same time period
   */
  async saveAnomalies(anomalies: DetectedAnomaly[]): Promise<number> {
    let savedCount = 0;

    for (const anomaly of anomalies) {
      try {
        // Check if this exact anomaly already exists
        const existing = await Anomaly.findOne({
          solarUnitId: anomaly.solarUnitId,
          type: anomaly.type,
          "affectedPeriod.start": anomaly.affectedPeriod.start,
          status: { $in: ["OPEN", "ACKNOWLEDGED"] },
        });

        if (!existing) {
          await Anomaly.create(anomaly);
          savedCount++;
          console.log(
            `[Anomaly Saved] ${anomaly.type} for ${anomaly.solarUnitId} at ${anomaly.affectedPeriod.start}`
          );
        } else {
          console.log(
            `[Anomaly Skipped] Duplicate ${anomaly.type} already exists`
          );
        }
      } catch (error) {
        console.error(`Error saving anomaly:`, error);
      }
    }

    return savedCount;
  }
}

/**
 * Run anomaly detection for all active solar units
 * This is called by the cron scheduler
 */
export async function runAnomalyDetectionForAllUnits(): Promise<{
  unitsProcessed: number;
  anomaliesDetected: number;
  anomaliesSaved: number;
}> {
  console.log(
    `[Anomaly Detection] Starting detection run at ${new Date().toISOString()}`
  );

  try {
    // Get all active solar units
    const solarUnits = await SolarUnit.find({ status: "ACTIVE" });
    console.log(`[Anomaly Detection] Processing ${solarUnits.length} active solar units`);

    const detector = new AnomalyDetector();
    let totalDetected = 0;
    let totalSaved = 0;

    for (const unit of solarUnits) {
      const anomalies = await detector.detectAnomalies(unit._id.toString());
      totalDetected += anomalies.length;

      const savedCount = await detector.saveAnomalies(anomalies);
      totalSaved += savedCount;
    }

    console.log(
      `[Anomaly Detection] Completed. Processed ${solarUnits.length} units, detected ${totalDetected} anomalies, saved ${totalSaved} new anomalies.`
    );

    return {
      unitsProcessed: solarUnits.length,
      anomaliesDetected: totalDetected,
      anomaliesSaved: totalSaved,
    };
  } catch (error) {
    console.error(`[Anomaly Detection] Error:`, error);
    throw error;
  }
}
