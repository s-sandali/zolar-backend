import mongoose from "mongoose";

const anomalySchema = new mongoose.Schema({
  solarUnitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SolarUnit",
    required: true,
    index: true,
  },

  type: {
    type: String,
    required: true,
    enum: [
      "NIGHTTIME_GENERATION",
      "ZERO_GENERATION_CLEAR_SKY",
      "OVERPRODUCTION",
      "HIGH_GENERATION_BAD_WEATHER",
      "LOW_GENERATION_CLEAR_WEATHER",
      "SUDDEN_PRODUCTION_DROP",
      "ERRATIC_OUTPUT",
    ],
    index: true,
  },

  severity: {
    type: String,
    required: true,
    enum: ["CRITICAL", "WARNING", "INFO"],
    index: true,
  },

  detectedAt: {
    type: Date,
    required: true,
    default: Date.now,
    index: true,
  },

  // The time period this anomaly affects
  affectedPeriod: {
    start: { type: Date, required: true },
    end: { type: Date },
  },

  // Reference to the energy record(s) that triggered this anomaly
  energyRecordIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EnergyGenerationRecord",
    },
  ],

  description: {
    type: String,
    required: true,
  },

  // Additional context for debugging/analysis
  metadata: {
    expectedValue: Number,
    actualValue: Number,
    deviation: Number,
    threshold: String,
  },

  status: {
    type: String,
    required: true,
    enum: ["OPEN", "ACKNOWLEDGED", "RESOLVED", "FALSE_POSITIVE"],
    default: "OPEN",
    index: true,
  },

  // User interaction
  acknowledgedAt: Date,
  acknowledgedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  resolvedAt: Date,
  resolutionNotes: String,
});

// Compound indexes for efficient queries
anomalySchema.index({ solarUnitId: 1, detectedAt: -1 });
anomalySchema.index({ solarUnitId: 1, status: 1, severity: 1 });

export const Anomaly = mongoose.model("Anomaly", anomalySchema);
