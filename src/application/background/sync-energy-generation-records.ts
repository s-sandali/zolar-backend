import { z } from "zod";
import { EnergyGenerationRecord } from "../../infrastructure/entities/EnergyGenerationRecord.ts";
import { SolarUnit } from "../../infrastructure/entities/SolarUnit.ts";

export const DataAPIEnergyGenerationRecordDto = z.object({
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

const buildEnergyGenerationRecordsUrl = (
    serialNumber: string,
    lastSyncedTimestamp?: Date
) => {
    const baseUrl = `${resolveDataApiBaseUrl()}/`;
    const url = new URL(
        `/api/energy-generation-records/solar-unit/${encodeURIComponent(serialNumber)}`,
        baseUrl
    );

    if (lastSyncedTimestamp) {
        url.searchParams.append("sinceTimestamp", lastSyncedTimestamp.toISOString());
    }

    return url;
};

/**
 * Synchronizes energy generation records from the data API
 * Fetches latest records and merges new data with existing records
 */
export const syncEnergyGenerationRecords = async () => {
    try {

        const solarUnits = await SolarUnit.find();

        for (const solarUnit of solarUnits) {

            // Get latest synced timestamp to only fetch new data
            const lastSyncedRecord = await EnergyGenerationRecord
                .findOne({ solarUnitId: solarUnit._id })
                .sort({ timestamp: -1 });

            // Build URL with sinceTimestamp query parameter
            const url = buildEnergyGenerationRecordsUrl(
                solarUnit.serialNumber,
                lastSyncedRecord?.timestamp
            );

            // Fetch latest records from data API with server-side filtering
            const dataAPIResponse = await fetch(url.toString());
            if (!dataAPIResponse.ok) {
                throw new Error("Failed to fetch energy generation records from data API");
            }

            const newRecords = DataAPIEnergyGenerationRecordDto
                .array()
                .parse(await dataAPIResponse.json());

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
                console.log(`Synced ${recordsToInsert.length} new energy generation records`);
            }
            else {
                console.log("No new records to sync");
            }
        }
    } catch (error) {
        console.error("Sync Job error:", error);
    }
};