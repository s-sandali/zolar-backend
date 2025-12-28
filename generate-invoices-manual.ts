/**
 * Manual script to generate invoices for testing purposes
 * Run this with: npx ts-node generate-invoices-manual.ts
 */

import dotenv from "dotenv";
import { connectDB } from "./src/infrastructure/db.js";
import { generateMonthlyInvoices } from "./src/application/background/generate-invoices.js";
import mongoose from "mongoose";

dotenv.config();

async function main() {
  try {
    console.log("Connecting to database...");
    await connectDB();

    console.log("Generating invoices (force mode enabled)...");
    await generateMonthlyInvoices(true); // Force generate regardless of date

    console.log("✅ Invoice generation complete!");
    console.log("Check your frontend at http://localhost:5173/dashboard/invoices");
  } catch (error) {
    console.error("❌ Error generating invoices:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from database");
  }
}

main();
