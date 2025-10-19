// src/routes/program.route.js
import express from "express";
import MeasurementController from "../controllers/MeasurementController.js";
import tokenMiddleware from '../middlewares/token.middleware.js';

const router = express.Router();
const measurementController = new MeasurementController();

router.get('/', measurementController.listAllMeasurements);

export default router;