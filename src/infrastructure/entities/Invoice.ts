import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    solarUnitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SolarUnit",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    billingPeriodStart: {
      type: Date,
      required: true,
    },
    billingPeriodEnd: {
      type: Date,
      required: true,
    },
    totalEnergyGenerated: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentStatus: {
      type: String,
      required: true,
      enum: ["PENDING", "PAID", "FAILED"],
      default: "PENDING",
    },
    paidAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
invoiceSchema.index({ userId: 1, createdAt: -1 });
invoiceSchema.index({ paymentStatus: 1 });
invoiceSchema.index({ solarUnitId: 1, billingPeriodStart: 1 });

export const Invoice =
  mongoose.models.Invoice ||
  mongoose.model("Invoice", invoiceSchema);
