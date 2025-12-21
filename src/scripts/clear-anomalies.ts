import mongoose from "mongoose";
import { Anomaly } from "../infrastructure/entities/Anomaly";
import dotenv from "dotenv";
import { connectDB } from "../infrastructure/db";

dotenv.config();

async function clearAnomalies() {
  try {
    await connectDB();

    const result = await Anomaly.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} anomalies`);

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

clearAnomalies();
