import { SolarUnit } from "../../infrastructure/entities/SolarUnit.ts";
import { Invoice } from "../../infrastructure/entities/Invoice.ts";
import { EnergyGenerationRecord } from "../../infrastructure/entities/EnergyGenerationRecord.ts";
import "../../infrastructure/entities/User.ts";

/**
 * Generates monthly invoices for all active solar units
 * Runs on a scheduled basis to create invoices based on installation date billing cycles
 * @param forceGenerate - If true, bypasses the date check and generates invoices for all units (useful for testing)
 */
export const generateMonthlyInvoices = async (forceGenerate: boolean = false) => {
  try {
    const today = new Date();
    console.log(`[${today.toISOString()}] Starting monthly invoice generation...`);

    // Get all active solar units
    const solarUnits = await SolarUnit.find({ status: "ACTIVE" }).populate("userId");

    let invoicesCreated = 0;

    for (const solarUnit of solarUnits) {
      // Calculate billing period based on installation date
      const installationDate = new Date(solarUnit.installationDate);
      const dayOfMonth = installationDate.getDate();

      // Calculate the billing period start and end
      let billingPeriodStart: Date;
      let billingPeriodEnd: Date;

      // If today's date matches the installation day, generate invoice
      // OR if forceGenerate is true (for manual testing)
      if (forceGenerate || today.getDate() === dayOfMonth) {
        // Billing period is from last month (same day) to today
        billingPeriodEnd = new Date(today);
        billingPeriodStart = new Date(today);
        billingPeriodStart.setMonth(billingPeriodStart.getMonth() - 1);

        // Set time to start/end of day
        billingPeriodStart.setHours(0, 0, 0, 0);
        billingPeriodEnd.setHours(23, 59, 59, 999);

        // Check if invoice already exists for this billing period
        const existingInvoice = await Invoice.findOne({
          solarUnitId: solarUnit._id,
          billingPeriodStart,
          billingPeriodEnd,
        });

        if (existingInvoice) {
          console.log(`Invoice already exists for solar unit ${solarUnit.serialNumber} for period ${billingPeriodStart} - ${billingPeriodEnd}`);
          continue;
        }

        // Calculate total energy generated during billing period
        const energyRecords = await EnergyGenerationRecord.aggregate([
          {
            $match: {
              solarUnitId: solarUnit._id,
              timestamp: {
                $gte: billingPeriodStart,
                $lte: billingPeriodEnd,
              },
            },
          },
          {
            $group: {
              _id: null,
              totalEnergy: { $sum: "$energyGenerated" },
            },
          },
        ]);

        const totalEnergyWh = energyRecords.length > 0 ? energyRecords[0].totalEnergy : 0;
        // Convert Wh to kWh for invoice
        const totalEnergyGenerated = totalEnergyWh / 1000;

        // Only create invoice if there's energy generated
        if (totalEnergyGenerated > 0) {
          await Invoice.create({
            solarUnitId: solarUnit._id,
            userId: solarUnit.userId,
            billingPeriodStart,
            billingPeriodEnd,
            totalEnergyGenerated,
            paymentStatus: "PENDING",
          });

          invoicesCreated++;
          console.log(`Created invoice for solar unit ${solarUnit.serialNumber}: ${totalEnergyGenerated.toFixed(2)} kWh`);
        } else {
          console.log(`No energy generated for solar unit ${solarUnit.serialNumber} during billing period`);
        }
      }
    }

    console.log(`[${new Date().toISOString()}] Invoice generation completed. Created ${invoicesCreated} invoices.`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Invoice generation failed:`, error);
    throw error;
  }
};
