// src/routes/program.route.js
import express from "express";
import MeasurementController from "../controllers/MeasurementController.js";
import tokenMiddleware from '../middlewares/token.middleware.js';

const router = express.Router();
const measurementController = new MeasurementController();

router.get('/coaches/:coachId/athletes', measurementController.listAthletesOfCoach);
router.get('/', measurementController.listAllMeasurements);
router.post('/sessions', measurementController.setNewRecord);
router.get('/leaderboard/:coachId', measurementController.getTeamLeaderboard);
router.get('/progress/:athleteId/:measurementId', measurementController.getAthleteProgress);

export default router;