import express from "express";
import {
  getCurrentWeather,
  weatherSolarUnitParamValidator,
} from "../application/weather";
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
  weatherSolarUnitParamValidator,
  getCurrentWeather
);

export default weatherRouter;
