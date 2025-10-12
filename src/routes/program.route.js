import ProgramController from "../controllers/ProgramController.js";
import express from "express";

const router = express.Router();
const programController = new ProgramController();
import tokenMiddleware from '../middlewares/token.middleware.js';


router.get('/:userId', tokenMiddleware.authenticateToken, programController.listAllProgramsOfUser);
router.post('/:userId', tokenMiddleware.authenticateToken, programController.createProgram);
router.get('/:programId', tokenMiddleware.authenticateToken, programController.getProgramById);
router.put('/:programId', tokenMiddleware.authenticateToken, programController.updateProgram);
router.delete('/:programId', tokenMiddleware.authenticateToken, programController.deleteProgram);

export default router;