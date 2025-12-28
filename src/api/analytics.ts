import express from "express";
import {
  getWeatherPerformance,
  getAnomalyDistributionHandler,
  getSystemHealthHandler,
  getPeakDistributionHandler,
  getCapacityFactorHandler,
  analyticsSolarUnitParamValidator,
  weatherPerformanceQueryValidator,
  anomalyDistributionQueryValidator,
  systemHealthQueryValidator,
  peakDistributionQueryValidator,
  capacityFactorQueryValidator,
} from "../application/analytics";
import { authenticationMiddleware } from "./middlewares/authentication-middleware";

const analyticsRouter = express.Router();

analyticsRouter
  .route("/weather-performance/:solarUnitId")
  .get(
    authenticationMiddleware,
    analyticsSolarUnitParamValidator,
    weatherPerformanceQueryValidator,
    getWeatherPerformance
  );

analyticsRouter
  .route("/anomaly-distribution/:solarUnitId")
  .get(
    authenticationMiddleware,
    analyticsSolarUnitParamValidator,
    anomalyDistributionQueryValidator,
    getAnomalyDistributionHandler
  );

analyticsRouter
  .route("/system-health/:solarUnitId")
  .get(
    authenticationMiddleware,
    analyticsSolarUnitParamValidator,
    systemHealthQueryValidator,
    getSystemHealthHandler
  );

analyticsRouter
  .route("/peak-distribution/:solarUnitId")
  .get(
    authenticationMiddleware,
    analyticsSolarUnitParamValidator,
    peakDistributionQueryValidator,
    getPeakDistributionHandler
  );

analyticsRouter
  .route("/capacity-factor/:solarUnitId")
  .get(
    authenticationMiddleware,
    analyticsSolarUnitParamValidator,
    capacityFactorQueryValidator,
    getCapacityFactorHandler
  );

export default analyticsRouter;
