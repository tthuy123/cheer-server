// controllers/program.controller.js
import ProgramModel from "../models/program.model.js";

const toMsg = (err) => (typeof err === "string" ? err : err?.message || "Unexpected error");

// (tuỳ chọn) lọc field hợp lệ để tránh người dùng gửi thừa
const pickProgramFields = (src = {}) => {
  const allowed = ["name", "type", "training_type", "started_at", "finished_at", "copied_from"];
  const out = {};
  for (const k of allowed) if (Object.prototype.hasOwnProperty.call(src, k)) out[k] = src[k];
  return out;
};

class ProgramController {
  // GET /users/:userId/programs
  // controllers/ProgramController.js
  async listAllProgramsOfUser(req, res) {
  const { userId } = req.params;
  const { type } = req.query; // nhận type từ query
  try {
    ProgramModel.listAllProgramsOfUser(userId, type, (error, rows) => {
      if (error) return res.status(500).json({ error: String(error) });
      return res.status(200).json({ programs: rows });
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}


  // POST /users/:userId/programs
  async createProgram(req, res) {
    const { userId } = req.params;
    const programData = pickProgramFields(req.body);
    try {
      ProgramModel.createProgram(userId, programData, (error, result) => {
        if (error) return res.status(400).json({ error: toMsg(error) });
        // 201 + Location header (tuỳ chọn)
        //res.setHeader("Location", `/users/${userId}/programs/${result.program_id}`);
        return res.status(201).json({ program: result });
      });
    } catch (error) {
      return res.status(500).json({ error: toMsg(error) });
    }
  }

  // GET /users/:userId/programs/:programId
  async getProgramById(req, res) {
    const { userId, programId } = req.params;
    try {
      ProgramModel.getProgramByIdForUser(userId, Number(programId), (error, result) => {
        if (error) return res.status(404).json({ error: toMsg(error) });
        return res.status(200).json({ program: result });
      });
    } catch (error) {
      return res.status(500).json({ error: toMsg(error) });
    }
  }

  // PATCH /users/:userId/programs/:programId
  async updateProgram(req, res) {
    const { userId, programId } = req.params;
    const programData = pickProgramFields(req.body);
    try {
      ProgramModel.updateProgramForUser(userId, Number(programId), programData, (error, result) => {
        if (error) return res.status(400).json({ error: toMsg(error) });
        return res.status(200).json({ message: result.message });
      });
    } catch (error) {
      return res.status(500).json({ error: toMsg(error) });
    }
  }

  // DELETE /users/:userId/programs/:programId   (soft-delete)
  async deleteProgram(req, res) {
    const { userId, programId } = req.params;
    // nếu muốn xoá hẳn: truyền options { hard: true }
    try {
      ProgramModel.deleteProgramForUser(userId, Number(programId), (error, result) => {
        if (error) return res.status(400).json({ error: toMsg(error) });
        return res.status(200).json({ message: result.message });
      });
    } catch (error) {
      return res.status(500).json({ error: toMsg(error) });
    }
  }

  async createProgramWithExercises(req, res) {
    const { userId } = req.params;
    const body = req.body || {};
    const programData = pickProgramFields(body.program ? body.program : body);
    const exercises = Array.isArray(body.exercises)
      ? body.exercises
      : Array.isArray(body.program?.exercises)
      ? body.program.exercises
      : [];

    try {
      ProgramModel.createProgramWithExercises(userId, programData, exercises, (error, result) => {
        if (error) return res.status(400).json({ error: toMsg(error) });
        return res.status(201).json({ program: result });
      });
    } catch (error) {
      return res.status(500).json({ error: toMsg(error) });
    }
  }

  // controllers/ProgramController.js
async searchProgramsByNameForUser(req, res) {
  const { userId } = req.params;
  const { name, type } = req.query;

  if (!String(name ?? '').trim()) {
    return res.status(400).json({ error: "Query param 'name' is required" });
  }

  try {
    ProgramModel.searchProgramsByNameForUser(
      userId,
      name,
      type,                                   // mới thêm
      (error, rows) => {
        if (error) return res.status(500).json({ error: String(error) });
        return res.status(200).json({ items: rows, q: name });
      }
    );
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

  async getProgramDetailsById(req, res) {
  try {
    // Ưu tiên lấy từ auth, fallback sang params
    const authUserId = req.user?.id || req.userId;
    const { userId: userIdParam, programId: programIdParam } = req.params;

    const userId = String(authUserId || userIdParam || '').trim();
    const programId = Number(programIdParam);

    // Validate
    if (!userId || Number.isNaN(programId)) {
      return res.status(400).json({ error: 'userId hoặc programId không hợp lệ' });
    }

    ProgramModel.getProgramDetailsById(
      userId,               // dùng để: p.created_by = ? và lọc training_data.user_id
      programId,            // dùng để: p.program_id = ?
      (error, result) => {
        if (error) {
          // Model trả 'Program not found' khi không có record
          if (String(error).toLowerCase().includes('not found')) {
            return res.status(404).json({ error: 'Program not found' });
          }
          console.error('getProgramDetailsById error:', error);
          return res.status(500).json({ error: 'Internal server error' });
        }
        return res.status(200).json({ program: result });
      }
    );
  } catch (err) {
    console.error('Unhandled getProgramDetailsById error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async saveWorkout(req, res) {
    try {
      const authUserId = req.user?.id || req.userId; // nếu bạn có middleware auth
      const { programId, programExerciseId } = req.params;

      // Cho phép FE gửi user_id hoặc lấy từ auth; ưu tiên auth
      const userId = String(authUserId || req.body.user_id || '').trim();
      if (!userId) {
        return res.status(400).json({ error: 'Missing userId' });
      }

      // Body từ FE
      const { note = '', sets = [], exercise_id } = req.body;

      if (!Array.isArray(sets)) {
        return res.status(400).json({ error: 'sets must be an array' });
      }

      const saved = await ProgramModel.createWorkoutForExercise({
        userId,
        programId: Number(programId),
        programExerciseId: Number(programExerciseId),
        exerciseId: exercise_id, // optional
        note,
        sets,
      });

      return res.status(201).json({ workout: saved });
    } catch (e) {
      console.error('saveWorkout error:', e);
      const msg = String(e?.message || e);
      if (msg.toLowerCase().includes('program exercise not found')) {
        return res.status(404).json({ error: 'Program exercise not found' });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
}

export default ProgramController;
