import { Types } from "mongoose";
import { EnergyGenerationRecord } from "../infrastructure/entities/EnergyGenerationRecord";
import { SolarUnit } from "../infrastructure/entities/SolarUnit";
import { Anomaly } from "../infrastructure/entities/Anomaly";

// Type definitions
export type AnomalyType =
  | "NIGHTTIME_GENERATION"
  | "ZERO_GENERATION_CLEAR_SKY"
  | "ENERGY_EXCEEDING_THRESHOLD"
  | "HIGH_GENERATION_BAD_WEATHER"
  | "LOW_GENERATION_CLEAR_WEATHER"
  | "SUDDEN_PRODUCTION_DROP"
  | "ERRATIC_OUTPUT"
  | "FROZEN_GENERATION";

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

interface DetectionRecord {
  _id: Types.ObjectId;
  timestamp: Date;
  energyGenerated: number;
  intervalHours?: number | null;
  weatherCondition?: string | null;
  cloudCover?: number | null;
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

      const thresholdCapacityAnomalies = await this.detectEnergyExceedingThreshold(
        solarUnitId
      );
      detectedAnomalies.push(...thresholdCapacityAnomalies);

      const weatherMismatchAnomalies = await this.detectWeatherPerformanceMismatch(
        solarUnitId
      );
      detectedAnomalies.push(...weatherMismatchAnomalies);

      const frozenGenerationAnomalies = await this.detectFrozenGeneration(
        solarUnitId
      );
      detectedAnomalies.push(...frozenGenerationAnomalies);

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

      const recentRecords: DetectionRecord[] = await EnergyGenerationRecord.find({
        solarUnitId,
        timestamp: { $gte: lookbackDate },
      })
        .sort({ timestamp: -1 })
        .lean<DetectionRecord[]>();

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

      const recentRecords: DetectionRecord[] = await EnergyGenerationRecord.find({
        solarUnitId,
        timestamp: { $gte: lookbackDate },
      })
        .sort({ timestamp: -1 })
        .lean<DetectionRecord[]>();

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
   * Algorithm 3: Energy Exceeding Threshold Capacity Detection
   *
   * Detects when energy generation exceeds the physical maximum capacity
   * Each solar unit has a maximum output: capacity (kW) × intervalHours
   * Values exceeding this are physically impossible and indicate data corruption
   *
   * Severity: CRITICAL (indicates serious data integrity issues)
   */
  async detectEnergyExceedingThreshold(
    solarUnitId: string
  ): Promise<DetectedAnomaly[]> {
    const anomalies: DetectedAnomaly[] = [];

    try {
      // Get solar unit to retrieve capacity
      const solarUnit = await SolarUnit.findById(solarUnitId);
      if (!solarUnit) {
        console.error(`Solar unit ${solarUnitId} not found`);
        return [];
      }

      // Get recent records (last 150 days to capture all test data from Aug 1)
      const lookbackDays = 150;
      const lookbackDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

      const recentRecords: DetectionRecord[] = await EnergyGenerationRecord.find({
        solarUnitId,
        timestamp: { $gte: lookbackDate },
      })
        .sort({ timestamp: -1 })
        .lean<DetectionRecord[]>();

      console.log(
        `[Threshold Capacity Detection] Checking ${recentRecords.length} records for solar unit ${solarUnitId}`
      );
      console.log(
        `[Threshold Capacity Detection] Solar unit capacity: ${solarUnit.capacity}W`
      );

      for (const record of recentRecords) {
        // Calculate maximum possible energy for this interval
        // maxEnergy = capacity (W) × intervalHours
        const intervalHours = record.intervalHours || 2;
        const maxEnergy = solarUnit.capacity * intervalHours;

        // If energy generated exceeds physical maximum, it's an anomaly
        if (record.energyGenerated > maxEnergy) {
          const excessPercent = Math.round(
            ((record.energyGenerated - maxEnergy) / maxEnergy) * 100
          );

          anomalies.push({
            solarUnitId,
            type: "ENERGY_EXCEEDING_THRESHOLD",
            severity: "CRITICAL",
            affectedPeriod: {
              start: record.timestamp,
              end: record.timestamp,
            },
            energyRecordIds: [record._id.toString()],
            description: `Energy generation of ${record.energyGenerated}Wh exceeds the physical maximum capacity of ${maxEnergy}Wh (${solarUnit.capacity}W × ${intervalHours}h). This indicates data corruption, miscalculation, or a serious system error.`,
            metadata: {
              expectedValue: maxEnergy,
              actualValue: record.energyGenerated,
              deviation: excessPercent,
              threshold: `Maximum physical capacity: ${maxEnergy}Wh (${solarUnit.capacity}W × ${intervalHours}h interval)`,
            },
          });
        }
      }

      console.log(
        `[Threshold Capacity Detection] Found ${anomalies.length} threshold capacity anomalies`
      );

      return anomalies;
    } catch (error) {
      console.error(
        `Error in detectEnergyExceedingThreshold for ${solarUnitId}:`,
        error
      );
      return [];
    }
  }

  /**
   * Algorithm 4: Weather-Performance Mismatch Detection
   *
   * Detects discrepancies between weather conditions and energy generation
   * - High generation during bad weather (rain/overcast)
   * - Low generation during clear weather
   *
   * Severity: WARNING (indicates sensor issues or weather data problems)
   */
  async detectWeatherPerformanceMismatch(
    solarUnitId: string
  ): Promise<DetectedAnomaly[]> {
    const anomalies: DetectedAnomaly[] = [];

    try {
      // Get recent records (last 150 days to capture all test data from Aug 1)
      const lookbackDays = 150;
      const lookbackDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

      const recentRecords: DetectionRecord[] = await EnergyGenerationRecord.find({
        solarUnitId,
        timestamp: { $gte: lookbackDate },
        weatherCondition: { $exists: true }, // Only check records with weather data
      })
        .sort({ timestamp: -1 })
        .lean<DetectionRecord[]>();

      console.log(
        `[Weather Mismatch Detection] Checking ${recentRecords.length} records for solar unit ${solarUnitId}`
      );

      for (const record of recentRecords) {
        const hour = record.timestamp.getUTCHours();
        const isDaytime = hour >= 6 && hour <= 18;

        if (!isDaytime) continue; // Skip nighttime records

        const weatherCondition = record.weatherCondition;
        const cloudCover = record.cloudCover || 0;
        const energyGenerated = record.energyGenerated;

        // Case 1: High generation during bad weather (rain or heavy overcast)
        // Rain/Overcast should reduce generation to <40% of typical peak (400 Wh)
        // If generating >500 Wh during rain/overcast, it's suspicious
        if ((weatherCondition === "rain" || (weatherCondition === "overcast" && cloudCover > 80)) && energyGenerated > 500) {
          anomalies.push({
            solarUnitId,
            type: "HIGH_GENERATION_BAD_WEATHER",
            severity: "WARNING",
            affectedPeriod: {
              start: record.timestamp,
              end: record.timestamp,
            },
            energyRecordIds: [record._id.toString()],
            description: `Solar panel generated ${energyGenerated}Wh during ${weatherCondition} conditions (${cloudCover}% cloud cover). This high output during bad weather suggests weather sensor malfunction or incorrect weather data.`,
            metadata: {
              expectedValue: 200, // Expected during bad weather
              actualValue: energyGenerated,
              deviation: Math.round(((energyGenerated - 200) / 200) * 100),
              threshold: `Weather: ${weatherCondition} (${cloudCover}% cloud cover), Expected <400 Wh during bad weather`,
            },
          });
        }

        // Case 2: Low generation during clear weather
        // Clear sky during peak hours (10-14) should generate >400 Wh
        // If generating <200 Wh during clear peak hours, it's suspicious
        const isPeakHours = hour >= 10 && hour <= 14;
        if (weatherCondition === "clear" && cloudCover < 20 && isPeakHours && energyGenerated < 200) {
          anomalies.push({
            solarUnitId,
            type: "LOW_GENERATION_CLEAR_WEATHER",
            severity: "WARNING",
            affectedPeriod: {
              start: record.timestamp,
              end: record.timestamp,
            },
            energyRecordIds: [record._id.toString()],
            description: `Solar panel generated only ${energyGenerated}Wh during clear sky conditions (${cloudCover}% cloud cover) at ${hour}:00 UTC. This low output during perfect conditions indicates potential panel issues or sensor problems.`,
            metadata: {
              expectedValue: 400, // Expected during clear peak hours
              actualValue: energyGenerated,
              deviation: Math.round(((energyGenerated - 400) / 400) * 100),
              threshold: `Weather: ${weatherCondition} (${cloudCover}% cloud cover), Peak hours (${hour}:00), Expected >400 Wh during clear sky`,
            },
          });
        }
      }

      console.log(
        `[Weather Mismatch Detection] Found ${anomalies.length} weather-performance mismatch anomalies`
      );

      return anomalies;
    } catch (error) {
      console.error(
        `Error in detectWeatherPerformanceMismatch for ${solarUnitId}:`,
        error
      );
      return [];
    }
  }

  /**
   * Algorithm 5: Frozen Generation Values (Stale Data) Detection
   *
   * Detects when energy values are stuck at the same value across multiple consecutive intervals
   * This indicates data collection issues, frozen sensors, or communication failures
   *
   * Detection criteria:
   * - N consecutive records with identical energy values (N >= 4)
   * - Strengthened by weather changes during the frozen period
   *
   * Severity: WARNING (indicates stale data, not necessarily panel malfunction)
   */
  async detectFrozenGeneration(
    solarUnitId: string
  ): Promise<DetectedAnomaly[]> {
    const anomalies: DetectedAnomaly[] = [];

    try {
      // Get recent records (last 150 days to capture all test data from Aug 1)
      const lookbackDays = 150;
      const lookbackDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

      const recentRecords: DetectionRecord[] = await EnergyGenerationRecord.find({
        solarUnitId,
        timestamp: { $gte: lookbackDate },
      })
        .sort({ timestamp: 1 })
        .lean<DetectionRecord[]>(); // Sort ascending to detect consecutive frozen values

      console.log(
        `[Frozen Generation Detection] Checking ${recentRecords.length} records for solar unit ${solarUnitId}`
      );

      // Minimum consecutive identical values to trigger anomaly
      const MIN_FROZEN_COUNT = 4;

      // Track frozen sequences
      let frozenSequence: DetectionRecord[] = [];
      let previousValue: number | null = null;

      for (let i = 0; i < recentRecords.length; i++) {
        const record = recentRecords[i];
        const energyValue = record.energyGenerated;

        if (energyValue === previousValue && previousValue !== null) {
          // Value is same as previous - add to frozen sequence
          frozenSequence.push(record);
        } else {
          // Value changed - check if previous sequence was long enough to be anomalous
          if (frozenSequence.length >= MIN_FROZEN_COUNT) {
            // Check if weather changed during the frozen period
            const weatherChanged = this.hasWeatherChanged(frozenSequence);

            // Additional check: Skip if all records are nighttime zeros (expected behavior)
            const allNighttimeZeros = frozenSequence.every(r => {
              const hour = r.timestamp.getUTCHours();
              const isNighttime = hour >= 19 || hour < 6;
              return isNighttime && r.energyGenerated === 0;
            });

            if (!allNighttimeZeros) {
              const description = weatherChanged
                ? `Solar panel reported identical energy value (${previousValue}Wh) for ${frozenSequence.length} consecutive intervals (${Math.round(frozenSequence.length * 2)} hours), despite changing weather conditions. This indicates frozen/stale data from sensor malfunction or communication failure.`
                : `Solar panel reported identical energy value (${previousValue}Wh) for ${frozenSequence.length} consecutive intervals (${Math.round(frozenSequence.length * 2)} hours). This indicates frozen/stale data from sensor malfunction or communication failure.`;

              anomalies.push({
                solarUnitId,
                type: "FROZEN_GENERATION",
                severity: "WARNING",
                affectedPeriod: {
                  start: frozenSequence[0].timestamp,
                  end: frozenSequence[frozenSequence.length - 1].timestamp,
                },
                energyRecordIds: frozenSequence.map((r) => r._id.toString()),
                description,
                metadata: {
                  actualValue: previousValue || 0,
                  threshold: `${MIN_FROZEN_COUNT} consecutive identical values (${frozenSequence.length} detected)`,
                  deviation: weatherChanged ? 100 : 50,
                },
              });
            }
          }

          // Start new sequence with current record
          frozenSequence = [record];
          previousValue = energyValue;
        }
      }

      // Check last sequence after loop ends
      if (frozenSequence.length >= MIN_FROZEN_COUNT && previousValue !== null) {
        const weatherChanged = this.hasWeatherChanged(frozenSequence);

        // Additional check: Skip if all records are nighttime zeros (expected behavior)
        const allNighttimeZeros = frozenSequence.every(r => {
          const hour = r.timestamp.getUTCHours();
          const isNighttime = hour >= 19 || hour < 6;
          return isNighttime && r.energyGenerated === 0;
        });

        if (!allNighttimeZeros) {
          const description = weatherChanged
            ? `Solar panel reported identical energy value (${previousValue}Wh) for ${frozenSequence.length} consecutive intervals (${Math.round(frozenSequence.length * 2)} hours), despite changing weather conditions. This indicates frozen/stale data from sensor malfunction or communication failure.`
            : `Solar panel reported identical energy value (${previousValue}Wh) for ${frozenSequence.length} consecutive intervals (${Math.round(frozenSequence.length * 2)} hours). This indicates frozen/stale data from sensor malfunction or communication failure.`;

          anomalies.push({
            solarUnitId,
            type: "FROZEN_GENERATION",
            severity: "WARNING",
            affectedPeriod: {
              start: frozenSequence[0].timestamp,
              end: frozenSequence[frozenSequence.length - 1].timestamp,
            },
            energyRecordIds: frozenSequence.map((r) => r._id.toString()),
            description,
            metadata: {
              actualValue: previousValue,
              threshold: `${MIN_FROZEN_COUNT} consecutive identical values (${frozenSequence.length} detected)`,
              deviation: weatherChanged ? 100 : 50,
            },
          });
        }
      }

      console.log(
        `[Frozen Generation Detection] Found ${anomalies.length} frozen generation anomalies`
      );

      return anomalies;
    } catch (error) {
      console.error(
        `Error in detectFrozenGeneration for ${solarUnitId}:`,
        error
      );
      return [];
    }
  }

  /**
   * Helper method: Check if weather conditions changed during a sequence of records
   */
  private hasWeatherChanged(records: DetectionRecord[]): boolean {
    if (records.length < 2) return false;

    const weatherConditions = new Set<string>();
    const cloudCovers = new Set<number>();

    for (const record of records) {
      if (record.weatherCondition) {
        weatherConditions.add(record.weatherCondition);
      }
      if (record.cloudCover !== undefined && record.cloudCover !== null) {
        cloudCovers.add(record.cloudCover);
      }
    }

    // Weather changed if we have more than one distinct weather condition or cloud cover
    return weatherConditions.size > 1 || cloudCovers.size > 1;
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
