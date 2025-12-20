import express from "express";
import { getCurrentWeatherForSolarUnit } from "../application/weather";
import { authenticationMiddleware } from "./middlewares/authentication-middleware";

const weatherRouter = express.Router();

/**
 * GET /api/weather/current/:solarUnitId
 * Get current weather data with solar impact analysis for a specific solar unit
 * Requires authentication
 */
weatherRouter.get(
  "/current/:solarUnitId",
  authenticationMiddleware,
  async (req, res, next) => {
    try {
      const { solarUnitId } = req.params;

      const weatherData = await getCurrentWeatherForSolarUnit(solarUnitId);

      res.json(weatherData);
    } catch (error) {
      next(error);
    }
  }
);

export default weatherRouter;
