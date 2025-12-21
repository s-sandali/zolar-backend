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
    const overproductionCount = await Anomaly.countDocuments({ type: "OVERPRODUCTION" });
    const totalCount = await Anomaly.countDocuments();

    console.log("✅ Anomalies in Database:");
    console.log(`   Nighttime Generation: ${nighttimeCount}`);
    console.log(`   Zero Generation Clear Sky: ${zeroGenCount}`);
    console.log(`   Overproduction: ${overproductionCount}`);
    console.log(`   Total: ${totalCount}\n`);

    const expectedTotal = 9 + 3 + 6; // 9 nighttime + 3 zero gen + 6 overproduction = 18
    if (nighttimeCount === 9 && zeroGenCount === 3 && overproductionCount === 6 && totalCount === expectedTotal) {
      console.log("🎉 SUCCESS! All anomalies detected correctly!");
      console.log(`   Expected: 9 nighttime + 3 zero generation + 6 overproduction = ${expectedTotal} total`);
      console.log(`   Got: ${nighttimeCount} nighttime + ${zeroGenCount} zero generation + ${overproductionCount} overproduction = ${totalCount} total`);
    } else {
      console.error(`❌ MISMATCH! Expected 9 nighttime + 3 zero generation + 6 overproduction = ${expectedTotal} total`);
      console.error(`   Got: ${nighttimeCount} nighttime + ${zeroGenCount} zero generation + ${overproductionCount} overproduction = ${totalCount} total`);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

testDetection();
