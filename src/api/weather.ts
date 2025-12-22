import express from "express";
import {
  getCurrentWeather,
  weatherSolarUnitParamValidator,
} from "../application/weather";
import { authenticationMiddleware } from "./middlewares/authentication-middleware";

const weatherRouter = express.Router();

weatherRouter
  .route("/current/:solarUnitId")
  .get(
    authenticationMiddleware,
    weatherSolarUnitParamValidator,
    getCurrentWeather
  );

export default weatherRouter;
