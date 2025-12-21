import { runAnomalyDetectionForAllUnits } from "../application/anomaly-detection";
import { syncEnergyGenerationRecords } from "../application/background/sync-energy-generation-records";
import { connectDB } from "../infrastructure/db";
import { EnergyGenerationRecord } from "../infrastructure/entities/EnergyGenerationRecord";
import { Anomaly } from "../infrastructure/entities/Anomaly";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

async function testDetection() {
  try {
    await connectDB();
    console.log("✅ Connected to MongoDB\n");

    // Step 1: Sync data
    console.log("📥 Step 1: Syncing data from data-api...");
    await syncEnergyGenerationRecords();

    const recordCount = await EnergyGenerationRecord.countDocuments();
    console.log(`✅ Backend now has ${recordCount} energy generation records\n`);

    // Step 2: Run detection
    console.log("🔍 Step 2: Running anomaly detection...");
    const result = await runAnomalyDetectionForAllUnits();

    console.log("\n📊 Detection Results:");
    console.log(`   Units Processed: ${result.unitsProcessed}`);
    console.log(`   Anomalies Detected: ${result.anomaliesDetected}`);
    console.log(`   Anomalies Saved: ${result.anomaliesSaved}\n`);

    // Step 3: Verify anomalies in database
    const nighttimeCount = await Anomaly.countDocuments({ type: "NIGHTTIME_GENERATION" });
    const zeroGenCount = await Anomaly.countDocuments({ type: "ZERO_GENERATION_CLEAR_SKY" });
    const thresholdCapacityCount = await Anomaly.countDocuments({ type: "ENERGY_EXCEEDING_THRESHOLD" });
    const highGenBadWeatherCount = await Anomaly.countDocuments({ type: "HIGH_GENERATION_BAD_WEATHER" });
    const lowGenClearWeatherCount = await Anomaly.countDocuments({ type: "LOW_GENERATION_CLEAR_WEATHER" });
    const frozenGenerationCount = await Anomaly.countDocuments({ type: "FROZEN_GENERATION" });
    const totalCount = await Anomaly.countDocuments();

    console.log("✅ Anomalies in Database:");
    console.log(`   Nighttime Generation: ${nighttimeCount}`);
    console.log(`   Zero Generation Clear Sky: ${zeroGenCount}`);
    console.log(`   Energy Exceeding Threshold: ${thresholdCapacityCount}`);
    console.log(`   High Generation Bad Weather: ${highGenBadWeatherCount}`);
    console.log(`   Low Generation Clear Weather: ${lowGenClearWeatherCount}`);
    console.log(`   Frozen Generation: ${frozenGenerationCount}`);
    console.log(`   Total: ${totalCount}\n`);

    // Expected: Some records may be detected by multiple algorithms (e.g., zero generation on clear day is both ZERO_GENERATION_CLEAR_SKY and LOW_GENERATION_CLEAR_WEATHER)
    // This is correct behavior - different perspectives on the same issue
    const expectedNighttime = 9;
    const expectedZeroGen = 3;
    const expectedThresholdCapacity = 6;

    if (nighttimeCount >= expectedNighttime && zeroGenCount >= expectedZeroGen && thresholdCapacityCount >= expectedThresholdCapacity) {
      console.log("🎉 SUCCESS! All core anomalies detected correctly!");
      console.log(`   Nighttime: ${nighttimeCount}/${expectedNighttime} ✓`);
      console.log(`   Zero Generation: ${zeroGenCount}/${expectedZeroGen} ✓`);
      console.log(`   Energy Exceeding Threshold: ${thresholdCapacityCount}/${expectedThresholdCapacity} ✓`);
      console.log(`   Weather Mismatches: ${highGenBadWeatherCount + lowGenClearWeatherCount} (includes overlaps with other types)`);
      console.log(`   Total Anomalies: ${totalCount}`);
    } else {
      console.error(`❌ MISMATCH in core anomalies!`);
      console.error(`   Nighttime: ${nighttimeCount}/${expectedNighttime} ${nighttimeCount >= expectedNighttime ? '✓' : '✗'}`);
      console.error(`   Zero Generation: ${zeroGenCount}/${expectedZeroGen} ${zeroGenCount >= expectedZeroGen ? '✓' : '✗'}`);
      console.error(`   Energy Exceeding Threshold: ${thresholdCapacityCount}/${expectedThresholdCapacity} ${thresholdCapacityCount >= expectedThresholdCapacity ? '✓' : '✗'}`);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

testDetection();
