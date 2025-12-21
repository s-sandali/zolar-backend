import mongoose from "mongoose";
import { SolarUnit } from "./entities/SolarUnit";
import { User } from "./entities/User";
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

    // Create a test user
    const user = await User.create({
      clerkUserId: " user_376z8DaZyeui6oM4vPE4u55lpRi", 
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

    console.log(`Database seeded successfully.`);
    console.log(`Created user: ${user.email} (${user.clerkUserId})`);
    console.log(`Created solar unit: ${solarUnit.serialNumber} for user ${user.email}`);
  } catch (err) {
    console.error("Seeding error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
