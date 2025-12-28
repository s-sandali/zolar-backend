/**
 * Manual script to sync ALL energy generation records from data-api
 * This will pull the entire historical dataset (Aug 1 - Nov 23, 2025)
 * Run this with: npx ts-node sync-all-records.ts
 */

import dotenv from "dotenv";
import { connectDB } from "./src/infrastructure/db.ts";
import { EnergyGenerationRecord } from "./src/infrastructure/entities/EnergyGenerationRecord.ts";
import { SolarUnit } from "./src/infrastructure/entities/SolarUnit.ts";
import mongoose from "mongoose";
import { z } from "zod";

dotenv.config();

const DataAPIEnergyGenerationRecordDto = z.object({
  _id: z.string(),
  serialNumber: z.string(),
  energyGenerated: z.number(),
  timestamp: z.string(),
  intervalHours: z.number(),
  weatherCondition: z.enum(["clear", "partly_cloudy", "overcast", "rain"]).optional(),
  cloudCover: z.number().optional(),
  __v: z.number(),
});

const resolveDataApiBaseUrl = () => {
  const configuredBaseUrl = process.env.DATA_API_BASE_URL?.trim();
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, "");
  }
  return "http://localhost:8001";
};

async function syncAllRecords() {
  try {
    console.log("Connecting to database...");
    await connectDB();

    console.log("Finding solar units...");
    const solarUnits = await SolarUnit.find();

    if (solarUnits.length === 0) {
      console.error("❌ No solar units found! Run seed first: npm run seed");
      return;
    }

    console.log(`Found ${solarUnits.length} solar unit(s)`);

    for (const solarUnit of solarUnits) {
      console.log(`\n📡 Syncing data for solar unit: ${solarUnit.serialNumber}`);

      // Clear existing records for clean sync
      const deleteResult = await EnergyGenerationRecord.deleteMany({ solarUnitId: solarUnit._id });
      console.log(`   Cleared ${deleteResult.deletedCount} existing records`);

      // Fetch ALL records from data-api (no sinceTimestamp filter)
      const baseUrl = resolveDataApiBaseUrl();
      const url = `${baseUrl}/api/energy-generation-records/solar-unit/${encodeURIComponent(solarUnit.serialNumber)}`;

      console.log(`   Fetching from: ${url}`);

      const dataAPIResponse = await fetch(url);
      if (!dataAPIResponse.ok) {
        throw new Error(`Failed to fetch from data API: ${dataAPIResponse.statusText}`);
      }

      const newRecords = DataAPIEnergyGenerationRecordDto
        .array()
        .parse(await dataAPIResponse.json());

      console.log(`   Received ${newRecords.length} records from data-api`);

      if (newRecords.length > 0) {
        // Transform API records to match schema
        const recordsToInsert = newRecords.map(record => ({
          solarUnitId: solarUnit._id,
          energyGenerated: record.energyGenerated,
          timestamp: new Date(record.timestamp),
          intervalHours: record.intervalHours,
          weatherCondition: record.weatherCondition,
          cloudCover: record.cloudCover,
        }));

        await EnergyGenerationRecord.insertMany(recordsToInsert);

        // Calculate date range
        const timestamps = recordsToInsert.map(r => r.timestamp);
        const minDate = new Date(Math.min(...timestamps.map(d => d.getTime())));
        const maxDate = new Date(Math.max(...timestamps.map(d => d.getTime())));

        console.log(`   ✅ Synced ${recordsToInsert.length} records`);
        console.log(`   📅 Date range: ${minDate.toISOString().split('T')[0]} to ${maxDate.toISOString().split('T')[0]}`);

        // Calculate total energy
        const totalEnergyWh = recordsToInsert.reduce((sum, r) => sum + r.energyGenerated, 0);
        const totalEnergyKwh = (totalEnergyWh / 1000).toFixed(2);
        console.log(`   ⚡ Total energy: ${totalEnergyKwh} kWh`);
      } else {
        console.log("   ⚠️  No records to sync");
      }
    }

    console.log("\n✅ Sync complete! Your analytics should now show historical data.");
    console.log("   Check your frontend at http://localhost:5173/dashboard/analytics");
  } catch (error) {
    console.error("❌ Sync error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from database");
  }
}

syncAllRecords();
