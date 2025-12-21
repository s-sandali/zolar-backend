import mongoose from "mongoose";
import { EnergyGenerationRecord } from "../infrastructure/entities/EnergyGenerationRecord";
import { SolarUnit } from "../infrastructure/entities/SolarUnit";
import dotenv from "dotenv";
import { connectDB } from "../infrastructure/db";

dotenv.config();

async function debugFrozen() {
  try {
    await connectDB();

    const solarUnit = await SolarUnit.findOne({ serialNumber: "SU-0001" });
    if (!solarUnit) {
      console.log("Solar unit not found");
      return;
    }

    const records = await EnergyGenerationRecord.find({
      solarUnitId: solarUnit._id,
      timestamp: {
        $gte: new Date("2025-09-24"),
        $lte: new Date("2025-09-27"),
      },
    }).sort({ timestamp: 1 });

    console.log(`Found ${records.length} records around frozen period (Sept 24-27):\n`);

    let previousValue: number | null = null;
    let sameCount = 0;

    for (const record of records) {
      const dateStr = record.timestamp.toISOString();
      const energyValue = record.energyGenerated;

      if (energyValue === previousValue) {
        sameCount++;
      } else {
        if (sameCount >= 4) {
          console.log(`  -> ${sameCount} consecutive ${previousValue}Wh values detected`);
        }
        sameCount = 1;
        previousValue = energyValue;
      }

      console.log(`${dateStr} | ${energyValue}Wh`);
    }

    if (sameCount >= 4) {
      console.log(`  -> ${sameCount} consecutive ${previousValue}Wh values detected`);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

debugFrozen();
