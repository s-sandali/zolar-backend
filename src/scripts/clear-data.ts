import mongoose from "mongoose";
import { EnergyGenerationRecord } from "../infrastructure/entities/EnergyGenerationRecord";
import { Anomaly } from "../infrastructure/entities/Anomaly";
import dotenv from "dotenv";
import { connectDB } from "../infrastructure/db";

dotenv.config();

async function clearData() {
  try {
    await connectDB();
    console.log("Connected to MongoDB");

    // Count before clearing
    const energyCount = await EnergyGenerationRecord.countDocuments();
    const anomalyCount = await Anomaly.countDocuments();

    console.log(`\nBefore clearing:`);
    console.log(`- Energy Generation Records: ${energyCount}`);
    console.log(`- Anomalies: ${anomalyCount}`);

    // Clear collections
    await EnergyGenerationRecord.deleteMany({});
    await Anomaly.deleteMany({});

    console.log(`\n✅ Cleared all data successfully`);

    // Verify
    const energyCountAfter = await EnergyGenerationRecord.countDocuments();
    const anomalyCountAfter = await Anomaly.countDocuments();

    console.log(`\nAfter clearing:`);
    console.log(`- Energy Generation Records: ${energyCountAfter}`);
    console.log(`- Anomalies: ${anomalyCountAfter}`);

    if (energyCountAfter === 0 && anomalyCountAfter === 0) {
      console.log(`\n✅ Verification successful - database is empty`);
    } else {
      console.error(`\n❌ Verification failed - data still exists`);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error clearing data:", error);
    process.exit(1);
  }
}

clearData();
