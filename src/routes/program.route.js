// src/routes/program.route.js
import express from "express";
import ProgramController from "../controllers/ProgramController.js";
import tokenMiddleware from '../middlewares/token.middleware.js';

const router = express.Router();
const programController = new ProgramController();

router.use(tokenMiddleware.authenticateToken);

router.get('/users/:userId', programController.listAllProgramsOfUser);
router.post('/users/:userId', programController.createProgramWithExercises);
router.get('/users/:userId/search', programController.searchProgramsByNameForUser);

router.get('/users/:userId/:programId', programController.getProgramById);
router.patch('/users/:userId/:programId', programController.updateProgram);
router.delete('/users/:userId/:programId', programController.deleteProgram);

export default router;
