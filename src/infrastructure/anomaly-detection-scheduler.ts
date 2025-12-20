import cron from "node-cron";
import { runAnomalyDetectionForAllUnits } from "../application/anomaly-detection";

/**
 * Initialize the anomaly detection cron scheduler
 * Runs anomaly detection periodically for all active solar units
 */
export const initializeAnomalyDetection = () => {
  // Run anomaly detection every 6 hours by default
  // Can be configured via ANOMALY_DETECTION_SCHEDULE env variable
  // Format: minute hour day month weekday
  // Examples:
  //   "0 */6 * * *" - Every 6 hours
  //   "0 0 * * *"   - Daily at midnight
  //   "*/30 * * * *" - Every 30 minutes (for testing)
  const schedule = process.env.ANOMALY_DETECTION_SCHEDULE || "0 */6 * * *";

  cron.schedule(schedule, async () => {
    try {
      await runAnomalyDetectionForAllUnits();
    } catch (error) {
      console.error("[Anomaly Detection Cron] Error running detection:", error);
    }
  });

  console.log(
    `[Anomaly Detection] Scheduler initialized - Detection runs at: ${schedule}`
  );
  console.log(
    `[Anomaly Detection] Set ANOMALY_DETECTION_SCHEDULE env variable to customize schedule`
  );
};
