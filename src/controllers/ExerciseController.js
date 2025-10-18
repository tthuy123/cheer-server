// controllers/exercise.controller.js
import ExerciseModel from "../models/exercise.model.js";

const toMsg = (e) => (typeof e === "string" ? e : e?.message || "Unexpected error");

// parse số nguyên dương
const toPosInt = (v, def = null) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : def;
};

const ExerciseController = {
  // GET /api/v1/exercises?page=1
  listAllExercises: (req, res) => {
    const page = toPosInt(req.query.page, 1);

    ExerciseModel.listAllExercises(page, (error, data) => {
      if (error) return res.status(500).json({ error: toMsg(error) });
      // model đã trả { items, page, pageSize, total, totalPages }
      return res.status(200).json(data);
    });
  },

  // GET /api/v1/programs/:programId/exercises
  listAllExercisesOfProgram: (req, res) => {
    const programId = toPosInt(req.params.programId);

    if (!programId) {
      return res.status(400).json({ error: "Invalid programId" });
    }

    ExerciseModel.listAllExercisesOfProgram(programId, (error, rows) => {
      if (error) return res.status(500).json({ error: toMsg(error) });
      return res.status(200).json({ program_id: programId, exercises: rows });
    });
  },

  // GET /api/v1/exercises/search?name=...
  searchExercisesByName: (req, res) => {
    const name = String(req.query.name ?? "").trim();

    if (!name) {
      return res.status(400).json({ error: "Query param 'name' is required" });
    }

    ExerciseModel.searchExercisesByName(name, (error, rows) => {
      if (error) return res.status(500).json({ error: toMsg(error) });
      return res.status(200).json({ items: rows, q: name });
    });
  },

  // GET /api/v1/exercises/:id
  getExerciseById: (req, res) => {
    const id = toPosInt(req.params.id);

    if (!id) {
      return res.status(400).json({ error: "Invalid exercise id" });
    }

    ExerciseModel.getExerciseById(id, (error, exercise) => {
      if (error) {
        // model trả 'Exercise not found' khi không có
        if (String(error).toLowerCase().includes("not found")) {
          return res.status(404).json({ error: "Exercise not found" });
        }
        return res.status(500).json({ error: toMsg(error) });
      }
      return res.status(200).json(exercise);
    });
  },
};

export default ExerciseController;
