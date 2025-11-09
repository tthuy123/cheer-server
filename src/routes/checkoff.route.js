import express from 'express';
import CheckOffController from '../controllers/CheckOffController.js';

const router = express.Router();

// Route tạo checkoff mới
router.post('/new', (req, res) => CheckOffController.createNewCheckoff(req, res));
// Route lấy review checkoff theo ID
router.get('/review/:coachId', (req, res) => CheckOffController.getCheckoffSubmitByCoach(req, res));
// Route thêm comment của coach vào checkoff
router.post('/comment/:checkoffId', (req, res) => CheckOffController.addCoachComment(req, res));

export default router;
