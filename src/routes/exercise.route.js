import ExerciseController from "../controllers/ExerciseController.js";
import express from "express";
const router = express.Router();
import tokenMiddleware from '../middlewares/token.middleware.js';

router.get("/", ExerciseController.listAllExercises);
router.get("/program/:programId", ExerciseController.listAllExercisesOfProgram);
router.get("/search", ExerciseController.searchExercisesByName);

router.get("/:id", ExerciseController.getExerciseById);

export default router;