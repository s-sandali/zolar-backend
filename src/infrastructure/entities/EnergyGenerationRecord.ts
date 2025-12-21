import mongoose from "mongoose";

const energyGenerationRecordSchema = new mongoose.Schema({
  solarUnitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SolarUnit",
    required: true,
  },
  energyGenerated: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  intervalHours: {
    type: Number,
    default: 2,
    min: 0.1,
    max: 24,
  },
  // Weather conditions at the time of measurement (synced from data-api)
  weatherCondition: {
    type: String,
    enum: ["clear", "partly_cloudy", "overcast", "rain"],
    required: false,
  },
  cloudCover: {
    type: Number, // 0-100%
    required: false,
  },
});

export const EnergyGenerationRecord = mongoose.model(
  "EnergyGenerationRecord",
  energyGenerationRecordSchema
);
