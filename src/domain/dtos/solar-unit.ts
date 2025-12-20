import { z } from "zod";

const LocationDto = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  city: z.string().optional(),
  country: z.string().optional(),
}).optional();

export const CreateSolarUnitDto = z.object({
  serialNumber: z.string().min(1),
  installationDate: z.string().min(1),
  capacity: z.number(),
  status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]),
  location: LocationDto,
});

export const UpdateSolarUnitDto = z.object({
  serialNumber: z.string().min(1),
  installationDate: z.string().min(1),
  capacity: z.number(),
  status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]),
  userId: z.string().min(1),
  location: LocationDto,
});

export const GetAllEnergyGenerationRecordsQueryDto = z.object({
  groupBy: z.enum(["date"]).optional(),
  limit: z.string().min(1),
});