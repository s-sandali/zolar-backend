import mongoose from "mongoose";
import { SolarUnit } from "./entities/SolarUnit";
import { User } from "./entities/User";
import { EnergyGenerationRecord } from "./entities/EnergyGenerationRecord";
import dotenv from "dotenv";
import { connectDB } from "./db";

dotenv.config();

async function seed() {
  try {
    // Connect to DB
    await connectDB();

    // Clear existing data
    await SolarUnit.deleteMany({});
    await User.deleteMany({});
    await EnergyGenerationRecord.deleteMany({});

    // Create a test user
    const user = await User.create({
      clerkUserId: "user_376z8DaZyeui6oM4vPE4u55lpRi",
      email: "sandalisandagomi@gmail.com",
      firstName: "Test",
      lastName: "User",
      role: "admin",
    });

    // Create a new solar unit linked to the user
    const solarUnit = await SolarUnit.create({
      serialNumber: "SU-0001",
      installationDate: new Date("2025-08-01"),
      capacity: 5000,
      status: "ACTIVE",
      userId: user._id,
    });

    // Create sample energy generation records for the past month
    const energyRecords = [];
    const today = new Date();
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    // Generate daily records for the past 30 days
    for (let i = 0; i < 30; i++) {
      const recordDate = new Date(lastMonth);
      recordDate.setDate(recordDate.getDate() + i);

      // Simulate realistic daily energy generation (varying throughout the day)
      const morningEnergy = Math.random() * 15 + 5; // 5-20 kWh
      const noonEnergy = Math.random() * 25 + 15; // 15-40 kWh
      const afternoonEnergy = Math.random() * 20 + 10; // 10-30 kWh
      const eveningEnergy = Math.random() * 10 + 2; // 2-12 kWh

      energyRecords.push(
        {
          solarUnitId: solarUnit._id,
          timestamp: new Date(recordDate.setHours(8, 0, 0, 0)),
          energyGenerated: morningEnergy,
        },
        {
          solarUnitId: solarUnit._id,
          timestamp: new Date(recordDate.setHours(12, 0, 0, 0)),
          energyGenerated: noonEnergy,
        },
        {
          solarUnitId: solarUnit._id,
          timestamp: new Date(recordDate.setHours(16, 0, 0, 0)),
          energyGenerated: afternoonEnergy,
        },
        {
          solarUnitId: solarUnit._id,
          timestamp: new Date(recordDate.setHours(18, 0, 0, 0)),
          energyGenerated: eveningEnergy,
        }
      );
    }

    await EnergyGenerationRecord.insertMany(energyRecords);

    const totalEnergy = energyRecords.reduce((sum, record) => sum + record.energyGenerated, 0);

    console.log(`Database seeded successfully.`);
    console.log(`Created user: ${user.email} (${user.clerkUserId})`);
    console.log(`Created solar unit: ${solarUnit.serialNumber} for user ${user.email}`);
    console.log(`Created ${energyRecords.length} energy generation records (Total: ${totalEnergy.toFixed(2)} kWh)`);
  } catch (err) {
    console.error("Seeding error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
