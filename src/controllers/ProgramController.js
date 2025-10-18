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
  async listAllProgramsOfUser(req, res) {
    const { userId } = req.params;
    console.log("✅ userId nhận từ route:", userId);
    try {
      ProgramModel.listAllProgramsOfUser(userId, (error, result) => {
        if (error) return res.status(400).json({ error: toMsg(error) });
        return res.status(200).json({ programs: result });
      });
    } catch (error) {
      return res.status(500).json({ error: toMsg(error) });
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
}

export default ProgramController;
