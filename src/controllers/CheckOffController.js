import NewCheckoffModel from '../models/checkoff.model.js';

import AccountModel from '../models/account.model.js';


class CheckOffController {
  async createNewCheckoff(req, res) {
  const {
    assigned_date,
    due_date,
    status,
    coach_id,
    assigned_task,
    note,
    receivers,
  } = req.body;

  const data = {
    assigned_date,
    due_date,
    status,
    coach_id,
    assigned_task,
    note,
    receivers,
  };

  NewCheckoffModel.create(data, (err, result) => {
    if (err) {
      return res.status(500).json({ error: err });
    }
    return res.status(201).json(result);
  });
  }

  async getCheckoffSubmitByCoach(req, res) {
    const { coachId } = req.params;
    NewCheckoffModel.getCheckoffSubmitByCoach(coachId, (err, result) => {
      if (err) {
        return res.status(500).json({ error: err });
      }
      return res.status(200).json(result);
    });
  }

  async addCoachComment(req, res) {
  const { checkoffId } = req.params;
  const { coachId, comment, status } = req.body; // thêm status từ frontend

  // Kiểm tra đầu vào cơ bản
  if (status !== 0 && status !== 1) {
    return res.status(400).json({ error: 'Invalid status value (must be 0 or 1)' });
  }

  try {
    NewCheckoffModel.addCoachComment(checkoffId, coachId, comment, status, (err, result) => {
      if (err) {
        console.error('Error in addCoachComment controller:', err);
        return res.status(500).json({ error: err });
      }
      return res.status(201).json(result);
    });
  } catch (error) {
    console.error('Unexpected error in addCoachComment:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
}

export default new CheckOffController();