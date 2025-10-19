// models/exercise.model.js
import pool from '../config/db.connect.js';

const notDeletedPE = '(pe.is_deleted = 0 OR pe.is_deleted IS NULL)';

function toInt(n, def = 1) {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? Math.trunc(v) : def;
}
function escapeLike(s = '') {
  // escape % and _ for LIKE
  return String(s).replace(/[%_]/g, (m) => '\\' + m);
}

const ExerciseModel = {
  // GET /exercises?page=1
  // Trả về: { items: [...], page, pageSize, total, totalPages }
  listAllExercises: async (page = 1, callback) => {
    try {
      const pageSize = 10;
      const p = toInt(page, 1);
      const offset = (p - 1) * pageSize;

      const [countRows] = await pool.query('SELECT COUNT(*) AS total FROM exercises');
      const total = countRows[0]?.total ?? 0;

      const sql = `
        SELECT 
          e.exercise_id,
          e.name,
          e.description,
          e.cues,
          e.video_url,
          e.image_url,
          e.created_at,
          e.updated_at
        FROM exercises e
        ORDER BY e.updated_at DESC, e.exercise_id DESC
        LIMIT ? OFFSET ?
      `;
      const [rows] = await pool.query(sql, [pageSize, offset]);

      callback(null, {
        items: rows,
        page: p,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      });
    } catch (error) {
      console.error('Error fetching exercises:', error);
      callback('An error occurred while fetching exercises');
    }
  },

  // GET /programs/:programId/exercises
  // Trả danh sách bài tập thuộc 1 program + dữ liệu nối (type, sets, status)
  listAllExercisesOfProgram: async (programId, callback) => {
    try {
      const sql = `
        SELECT 
          e.exercise_id,
          e.name,
          e.description,
          e.cues,
          e.video_url,
          e.image_url,
          e.created_at,
          e.updated_at,
          -- fields từ bảng nối
          pe.program_exercise_id,
          pe.type        AS pe_type,
          pe.sets        AS pe_sets,
          pe.status      AS pe_status,
          pe.created_at  AS pe_created_at,
          pe.updated_at  AS pe_updated_at
        FROM exercises e
        JOIN program_exercises pe 
          ON e.exercise_id = pe.exercise_id
        WHERE pe.program_id = ? 
          AND ${notDeletedPE}
        ORDER BY pe.program_exercise_id ASC
      `;
      const [rows] = await pool.query(sql, [Number(programId)]);
      callback(null, rows);
    } catch (error) {
      console.error('Error fetching exercises of program:', error);
      callback('An error occurred while fetching exercises of the program');
    }
  },

  // GET /exercises/search?name=...
  searchExercisesByName: async (name, callback) => {
  try {
    const term = String(name ?? '').trim();
    if (!term) return callback('Query param "name" is required');

    const sql = `
      SELECT 
        e.exercise_id,
        e.name,
        e.description,
        e.cues,
        e.video_url,
        e.image_url,
        e.created_at,
        e.updated_at
      FROM exercises e
      WHERE e.name LIKE CONCAT('%', ?, '%')
      ORDER BY e.updated_at DESC, e.exercise_id DESC
    `;
    const [rows] = await pool.query(sql, [term]);
    callback(null, rows);
  } catch (error) {
    console.error('Error searching exercises:', error);
    callback('An error occurred while searching exercises');
  }
},


  // GET /exercises/:id
  getExerciseById: async (id, callback) => {
    try {
      const sql = `
        SELECT 
          e.exercise_id,
          e.name,
          e.description,
          e.cues,
          e.video_url,
          e.image_url,
          e.created_at,
          e.updated_at
        FROM exercises e
        WHERE e.exercise_id = ?
        LIMIT 1
      `;
      const [rows] = await pool.query(sql, [Number(id)]);
      if (!rows.length) return callback('Exercise not found');
      callback(null, rows[0]);
    } catch (error) {
      console.error('Error fetching exercise:', error);
      callback('An error occurred while fetching the exercise');
    }
  },
};

export default ExerciseModel;
