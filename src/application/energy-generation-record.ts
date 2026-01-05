import { GetAllEnergyGenerationRecordsQueryDto } from "../domain/dtos/solar-unit";
import { ValidationError } from "../domain/errors/errors";
import { EnergyGenerationRecord } from "../infrastructure/entities/EnergyGenerationRecord";
import { NextFunction, Request, Response } from "express";
import { PipelineStage, Types } from "mongoose";

export const getAllEnergyGenerationRecordsBySolarUnitId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const results = GetAllEnergyGenerationRecordsQueryDto.safeParse(req.query);
    if (!results.success) {
      throw new ValidationError(results.error.message);
    }

    const { groupBy, limit } = results.data;

    if (!groupBy) {
      const energyGenerationRecords = await EnergyGenerationRecord.find({
        solarUnitId: id,
      }).sort({ timestamp: -1 });
      res.status(200).json(energyGenerationRecords);
      return;
    }

    if (groupBy === "date") {
      const solarUnitObjectId = new Types.ObjectId(id);
      const basePipeline: PipelineStage[] = [
        {
          $match: { solarUnitId: solarUnitObjectId },
        },
        {
          $group: {
            _id: {
              date: {
                $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
              },
            },
            totalEnergyWh: { $sum: "$energyGenerated" },
          },
        },
        {
          $addFields: {
            totalEnergy: { $divide: ["$totalEnergyWh", 1000] },
          },
        },
        {
          $project: {
            totalEnergyWh: 0,
          },
        },
        {
          $sort: { "_id.date": -1 as 1 | -1 },
        },
      ];

      const energyGenerationRecords = await EnergyGenerationRecord.aggregate(basePipeline);

      if (!limit) {
        res.status(200).json(energyGenerationRecords);
        return;
      }

      res.status(200).json(energyGenerationRecords.slice(0, Number.parseInt(limit, 10)));
      return;
    }
  } catch (error) {
    next(error);
  }
};
