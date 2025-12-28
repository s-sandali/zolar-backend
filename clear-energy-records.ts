/**
 * Script to clear all energy generation records from backend
 * Run this with: npx ts-node clear-energy-records.ts
 */

import dotenv from "dotenv";
import { connectDB } from "./src/infrastructure/db.js";
import { EnergyGenerationRecord } from "./src/infrastructure/entities/EnergyGenerationRecord.js";
import mongoose from "mongoose";

dotenv.config();

async function clearRecords() {
  try {
    console.log("Connecting to database...");
    await connectDB();

    console.log("Clearing all energy generation records...");
    const result = await EnergyGenerationRecord.deleteMany({});

    console.log(`✅ Cleared ${result.deletedCount} records from backend database`);
    console.log("Ready for fresh sync from data-api");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from database");
  }
}

clearRecords();
