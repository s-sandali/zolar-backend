import express from "express";
import { authenticationMiddleware } from "./middlewares/authentication-middleware";
import { authorizationMiddleware } from "./middlewares/authorization-middleware";
import {
  getUserAnomaliesHandler,
  getAllAnomaliesHandler,
  acknowledgeAnomalyHandler,
  resolveAnomalyHandler,
  getAnomalyStatsHandler,
  getUserAnomaliesValidator,
  getAllAnomaliesValidator,
  anomalyIdParamValidator,
  resolveAnomalyValidator,
  getDebugInfo,
  triggerDetectionHandler,
  triggerSyncHandler,
} from "../application/anomalies";

const anomaliesRouter = express.Router();

anomaliesRouter
  .route("/me")
  .get(
    authenticationMiddleware,
    getUserAnomaliesValidator,
    getUserAnomaliesHandler
  );

anomaliesRouter
  .route("/")
  .get(
    authenticationMiddleware,
    authorizationMiddleware,
    getAllAnomaliesValidator,
    getAllAnomaliesHandler
  );

anomaliesRouter
  .route("/stats")
  .get(authenticationMiddleware, getAnomalyStatsHandler);

anomaliesRouter
  .route("/:id/acknowledge")
  .patch(
    authenticationMiddleware,
    anomalyIdParamValidator,
    acknowledgeAnomalyHandler
  );

anomaliesRouter
  .route("/:id/resolve")
  .patch(
    authenticationMiddleware,
    anomalyIdParamValidator,
    resolveAnomalyValidator,
    resolveAnomalyHandler
  );

anomaliesRouter
  .route("/trigger-detection")
  .post(authenticationMiddleware, triggerDetectionHandler);

anomaliesRouter
  .route("/trigger-sync")
  .post(authenticationMiddleware, triggerSyncHandler);

anomaliesRouter
  .route("/debug")
  .get(authenticationMiddleware, getDebugInfo);

export default anomaliesRouter;
