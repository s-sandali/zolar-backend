/**
 * Manual script to run anomaly detection
 * Run this with: npx ts-node run-anomaly-detection.ts
 */

import dotenv from "dotenv";
import { connectDB } from "./src/infrastructure/db";
import { runAnomalyDetectionForAllUnits } from "./src/application/anomaly-detection";
import mongoose from "mongoose";

dotenv.config();

async function main() {
  try {
    console.log("Connecting to database...");
    await connectDB();

    console.log("Running anomaly detection...");
    const result = await runAnomalyDetectionForAllUnits();

    console.log("\n✅ Anomaly detection complete!");
    console.log(`   Units processed: ${result.unitsProcessed}`);
    console.log(`   Anomalies detected: ${result.anomaliesDetected}`);
    console.log(`   New anomalies saved: ${result.anomaliesSaved}`);
    console.log("\nCheck anomalies at: http://localhost:5173/dashboard/anomalies");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from database");
  }
}

main();
