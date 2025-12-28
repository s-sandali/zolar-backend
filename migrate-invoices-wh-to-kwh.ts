/**
 * Migration Script: Convert Invoice Energy from Wh to kWh
 *
 * This script converts all existing invoice totalEnergyGenerated values
 * from Wh (watt-hours) to kWh (kilowatt-hours) by dividing by 1000.
 *
 * Run this ONCE to fix old invoices that were created before the conversion was added.
 */

import "dotenv/config";
import mongoose from "mongoose";
import { Invoice } from "./src/infrastructure/entities/Invoice";

async function migrateInvoices() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URL;
    if (!mongoUri) {
      throw new Error("MONGO_URI or MONGODB_URL environment variable is not set");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Find all invoices with energy > 100 (likely in Wh, not kWh)
    // Reasonable assumption: most solar panels won't generate > 100 kWh in a month
    const invoicesToMigrate = await Invoice.find({
      totalEnergyGenerated: { $gt: 100 }
    });

    console.log(`\nFound ${invoicesToMigrate.length} invoices that need conversion`);

    if (invoicesToMigrate.length === 0) {
      console.log("✅ No invoices need conversion. All done!");
      await mongoose.disconnect();
      return;
    }

    // Show preview of changes
    console.log("\n📋 Preview of changes:");
    console.log("┌─────────────────────────┬──────────────┬──────────────┐");
    console.log("│ Invoice ID              │ Old (Wh)     │ New (kWh)    │");
    console.log("├─────────────────────────┼──────────────┼──────────────┤");

    invoicesToMigrate.slice(0, 5).forEach(invoice => {
      const oldValue = invoice.totalEnergyGenerated;
      const newValue = oldValue / 1000;
      console.log(`│ ${invoice._id.toString().padEnd(23)} │ ${oldValue.toString().padEnd(12)} │ ${newValue.toFixed(2).padEnd(12)} │`);
    });

    if (invoicesToMigrate.length > 5) {
      console.log(`│ ... and ${invoicesToMigrate.length - 5} more invoices`);
    }
    console.log("└─────────────────────────┴──────────────┴──────────────┘");

    // Confirm before proceeding
    console.log("\n⚠️  This will update the database. Make sure you have a backup!");
    console.log("💡 Set DRY_RUN=true to test without making changes\n");

    const isDryRun = process.env.DRY_RUN === "true";

    if (isDryRun) {
      console.log("🏃 DRY RUN MODE - No changes will be made");
    } else {
      console.log("🚀 LIVE MODE - Converting invoices...");

      // Perform bulk update
      const bulkOps = invoicesToMigrate.map(invoice => ({
        updateOne: {
          filter: { _id: invoice._id },
          update: {
            $set: {
              totalEnergyGenerated: invoice.totalEnergyGenerated / 1000
            }
          }
        }
      }));

      const result = await Invoice.bulkWrite(bulkOps);

      console.log(`\n✅ Migration completed!`);
      console.log(`   Modified: ${result.modifiedCount} invoices`);
      console.log(`   Matched: ${result.matchedCount} invoices`);
    }

    // Verify the migration
    console.log("\n🔍 Verifying migration...");
    const remainingInvoices = await Invoice.find({
      totalEnergyGenerated: { $gt: 100 }
    });

    if (remainingInvoices.length === 0) {
      console.log("✅ All invoices successfully converted to kWh!");
    } else {
      console.log(`⚠️  Warning: ${remainingInvoices.length} invoices still have values > 100`);
      console.log("   This might be expected for high-production solar units.");
    }

    // Show summary statistics
    const stats = await Invoice.aggregate([
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          avgEnergy: { $avg: "$totalEnergyGenerated" },
          minEnergy: { $min: "$totalEnergyGenerated" },
          maxEnergy: { $max: "$totalEnergyGenerated" }
        }
      }
    ]);

    if (stats.length > 0) {
      console.log("\n📊 Invoice Energy Statistics:");
      console.log(`   Total Invoices: ${stats[0].count}`);
      console.log(`   Average Energy: ${stats[0].avgEnergy.toFixed(2)} kWh`);
      console.log(`   Min Energy: ${stats[0].minEnergy.toFixed(2)} kWh`);
      console.log(`   Max Energy: ${stats[0].maxEnergy.toFixed(2)} kWh`);
    }

    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
    console.log("🎉 Migration complete!");

  } catch (error) {
    console.error("❌ Migration failed:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the migration
migrateInvoices();
