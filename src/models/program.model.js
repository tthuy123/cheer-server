// models/ProgramModel.js
import pool from '../config/db.connect.js';

const TABLE = 'programs';
const notDeleted = 'IFNULL(is_deleted,0)=0';

// helper: build SET clause only for provided fields
function buildUpdateSet(data) {
  const allowed = ['name','type','training_type','started_at','finished_at','copied_from'];
  const fields = [];
  const params = [];
  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(data, k)) {
      fields.push(`${k} = ?`);
      params.push(data[k] ?? null); // allow nulls
    }
  }
  // always bump updated_at
  fields.push('updated_at = NOW()');
  return { setClause: fields.join(', '), params };
}

const ProgramModel = {
  // 1) List all programs created by a user (not deleted)
 // models/program.model.js
listAllProgramsOfUser: async (userId, type, callback) => {
  try {
    // debug (tùy chọn)
    const [dbg1] = await pool.query('SELECT DATABASE() AS db');
    const [dbg2] = await pool.query('SELECT COUNT(*) AS total FROM programs');
    console.log('DB using:', dbg1[0].db, ' | programs.count =', dbg2[0].total);

    // Base SQL
    let sql = `
      SELECT
        p.program_id,
        p.name,
        p.type,
        p.training_type,
        p.started_at,
        p.finished_at,
        p.created_at,
        p.updated_at,

        -- Tên các bài tập (dạng chuỗi)
        GROUP_CONCAT(DISTINCT e.name ORDER BY pe.program_exercise_id SEPARATOR ', ') AS exercise_names,

        -- Danh sách bài tập (dạng JSON array, không null)
        COALESCE(
          JSON_ARRAYAGG(
            IF(
              e.exercise_id IS NULL, NULL,
              JSON_OBJECT(
                'program_exercise_id', pe.program_exercise_id,
                'exercise_id',         e.exercise_id,
                'name',                e.name,
                'type',                pe.type,
                'status',              pe.status,
                'sets',                pe.sets
              )
            )
          ),
          JSON_ARRAY()
        ) AS exercises

      FROM programs AS p
      LEFT JOIN program_exercises AS pe
        ON pe.program_id = p.program_id
       AND (pe.is_deleted = 0 OR pe.is_deleted IS NULL)
      LEFT JOIN exercises AS e
        ON e.exercise_id = pe.exercise_id

      WHERE TRIM(p.created_by) = TRIM(?)
        AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
    `;

    const params = [String(userId).trim()];

    // Thêm điều kiện lọc theo type nếu có
    if (type && type !== 'all') {
      sql += ` AND p.type = ? `;
      params.push(String(type));
    }

    sql += `
      GROUP BY p.program_id
      ORDER BY p.created_at DESC
    `;

    const [rows] = await pool.query(sql, params);
    console.log('Rows for userId:', userId, '=>', rows.length);

    callback(null, rows);
  } catch (err) {
    console.error('Error fetching programs:', err);
    callback('An error occurred while fetching programs');
  }
},


  // 2) Create program — CAREFUL: use AUTO_INCREMENT, set created_by
  // programData may include: name, type, training_type, started_at, finished_at, copied_from
  createProgram: async (userId, programData, callback) => {
    try {
      const {
        name = null,
        type = null,
        training_type = null,
        started_at = null,
        finished_at = null,
        copied_from = null
      } = programData ?? {};

      const sql = `
        INSERT INTO ${TABLE}
          (name, type, training_type, started_at, finished_at,
           created_at, updated_at, created_by, copied_from, is_deleted)
        VALUES (?, ?, ?, ?, ?, NOW(), NOW(), ?, ?, 0)
      `;
      const params = [
        name, type, training_type, started_at, finished_at,
        userId, copied_from
      ];
      const [result] = await pool.query(sql, params);

      // MySQL AUTO_INCREMENT id:
      const program_id = result.insertId;

      callback(null, {
        program_id,
        name, type, training_type, started_at, finished_at, copied_from,
        created_by: userId
      });
    } catch (err) {
      console.error('Error creating program:', err);
      callback('An error occurred while creating the program');
    }
  },

  // 3) Get program by id (scoped to owner)
  getProgramByIdForUser: async (userId, programId, callback) => {
    try {
      const sql = `SELECT * FROM ${TABLE}
                   WHERE program_id = ? AND created_by = ? AND ${notDeleted}`;
      const [rows] = await pool.query(sql, [programId, userId]);
      if (rows.length === 0) return callback('Program not found');
      callback(null, rows[0]);
    } catch (err) {
      console.error('Error fetching program:', err);
      callback('An error occurred while fetching the program');
    }
  },

  // 4) Update (only provided fields). Owner-scoped.
  updateProgramForUser: async (userId, programId, programData, callback) => {
    try {
      const { setClause, params } = buildUpdateSet(programData || {});
      if (params.length === 1 && setClause === 'updated_at = NOW()') {
        return callback('No fields to update');
      }
      const sql = `UPDATE ${TABLE}
                   SET ${setClause}
                   WHERE program_id = ? AND created_by = ? AND ${notDeleted}`;
      const [res] = await pool.query(sql, [...params, programId, userId]);
      if (res.affectedRows === 0) return callback('Program not found or no changes made');
      callback(null, { message: 'Program updated successfully' });
    } catch (err) {
      console.error('Error updating program:', err);
      callback('An error occurred while updating the program');
    }
  },

  // 5) Delete — soft delete by default (set is_deleted = 1)
  deleteProgramForUser: async (userId, programId, callback, { hard = false } = {}) => {
    try {
      if (hard) {
        const sql = `DELETE FROM ${TABLE} WHERE program_id = ? AND created_by = ?`;
        const [res] = await pool.query(sql, [programId, userId]);
        if (res.affectedRows === 0) return callback('Program not found');
        return callback(null, { message: 'Program permanently deleted' });
      }
      const sql = `UPDATE ${TABLE}
                   SET is_deleted = 1, updated_at = NOW()
                   WHERE program_id = ? AND created_by = ? AND ${notDeleted}`;
      const [res] = await pool.query(sql, [programId, userId]);
      if (res.affectedRows === 0) return callback('Program not found');
      callback(null, { message: 'Program deleted successfully' });
    } catch (err) {
      console.error('Error deleting program:', err);
      callback('An error occurred while deleting the program');
    }
  },
  createProgramWithExercises: async (userId, programData, exercises = [], callback) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

  // Insert vào bảng programs
      const insertProgramSQL = `
        INSERT INTO ${TABLE}
          (name, type, training_type, started_at, finished_at,
           created_at, updated_at, created_by, copied_from, is_deleted)
        VALUES (?, ?, ?, ?, ?, NOW(), NOW(), ?, ?, 0)
      `;

      const programParams = [
        programData.name || null,
        programData.type || null,
        programData.training_type || null,
        programData.started_at || null,
        programData.finished_at || null,
        userId,
        programData.copied_from || null,
      ];

      const [programResult] = await conn.query(insertProgramSQL, programParams);
      const program_id = programResult.insertId;

      // Nếu có danh sách exercises
      for (const ex of exercises) {
        const insertProgramExerciseSQL = `
          INSERT INTO program_exercises
            (type, sets, status, created_at, updated_at, program_id, exercise_id, is_deleted)
          VALUES (?, ?, ?, NOW(), NOW(), ?, ?, 0)
        `;

        const params = [
          ex.type || null,
          JSON.stringify(ex.sets || null),
          ex.status || 0,
          program_id,
          ex.exercise_id || null,
        ];

        await conn.query(insertProgramExerciseSQL, params);
      }

      await conn.commit();

      callback(null, {
        program_id,
        name: programData.name,
        type: programData.type,
        training_type: programData.training_type,
        created_by: userId,
        total_exercises: exercises.length,
      });
    } catch (err) {
      await conn.rollback();
      console.error(" Error creating program with exercises:", err);
      callback("An error occurred while creating the program and exercises");
    } finally {
      conn.release();
    }
  },

searchProgramsByNameForUser: async (userId, nameQuery, type, callback) => {
  try {
    const uid  = String(userId).trim();
    const term = String(nameQuery ?? '').trim();
    if (!term) return callback(null, []);

    const notDeletedProg = '(p.is_deleted  = 0 OR p.is_deleted  IS NULL)';
    const notDeletedPE   = '(pe.is_deleted = 0 OR pe.is_deleted IS NULL)';

    let sql = `
      SELECT
        p.program_id,
        p.name,
        p.type,
        p.training_type,
        p.started_at,
        p.finished_at,
        p.created_at,
        p.updated_at,

        -- chuỗi tên bài tập
        GROUP_CONCAT(DISTINCT e.name ORDER BY pe.program_exercise_id SEPARATOR ', ') AS exercise_names,

        -- mảng JSON bài tập (không null)
        COALESCE(
          JSON_ARRAYAGG(
            IF(
              e.exercise_id IS NULL, NULL,
              JSON_OBJECT(
                'program_exercise_id', pe.program_exercise_id,
                'exercise_id',         e.exercise_id,
                'name',                e.name,
                'type',                pe.type,
                'status',              pe.status,
                'sets',                pe.sets
              )
            )
          ),
          JSON_ARRAY()
        ) AS exercises
      FROM programs AS p
      LEFT JOIN program_exercises AS pe
        ON pe.program_id = p.program_id
       AND ${notDeletedPE}
      LEFT JOIN exercises AS e
        ON e.exercise_id = pe.exercise_id
      WHERE TRIM(p.created_by) = TRIM(?)
        AND p.name LIKE CONCAT('%', ?, '%')
        AND ${notDeletedProg}
    `;

    const params = [uid, term];

    if (type && type !== 'all') {
      sql += ` AND p.type = ? `;
      params.push(String(type));
    }

    sql += `
      GROUP BY p.program_id
      ORDER BY p.created_at DESC
    `;

    const [rows] = await pool.query(sql, params);
    return callback(null, rows);
  } catch (err) {
    console.error('Error searching programs:', err);
    return callback('An error occurred while searching for programs');
  }
},
  getProgramDetailsById: async (userId, programId, callback) => {
  try {
    const sql = `
      SELECT
        p.program_id,
        p.name,
        p.type,
        p.training_type,
        p.started_at,
        p.finished_at,
        p.created_at,
        p.updated_at,

        COALESCE(
          JSON_ARRAYAGG(
            IF(
              e.exercise_id IS NULL, NULL,
              JSON_OBJECT(
                'program_exercise_id', pe.program_exercise_id,
                'exercise_id',         e.exercise_id,
                'name',                e.name,
                'type',                pe.type,
                'status',              pe.status,
                'sets',                pe.sets,
                'exercise_meta', JSON_OBJECT(
                  'description', e.description,
                  'cues',        e.cues,
                  'video_url',   e.video_url,
                  'image_url',   e.image_url,
                  'created_at',  e.created_at,
                  'updated_at',  e.updated_at
                ),
                'past_workouts',
                COALESCE((
                  SELECT
                    IFNULL(
                      CONCAT(
                        '[',
                        GROUP_CONCAT(t.j ORDER BY t.created_at DESC SEPARATOR ','),
                        ']'
                      ),
                      JSON_ARRAY()
                    )
                  FROM (
                    SELECT
                      JSON_OBJECT(
                        'training_data_id', td.training_data_id,
                        'created_at',       td.created_at,
                        'updated_at',       td.updated_at,
                        'note',             td.note,
                        'sets',             td.sets
                      ) AS j,
                      td.created_at
                    FROM training_data td
                    WHERE td.exercise_id = e.exercise_id
                      AND td.user_id = ?
                  ) AS t
                ), JSON_ARRAY())
              )
            )
          ),
          JSON_ARRAY()
        ) AS exercises

      FROM programs AS p
      LEFT JOIN program_exercises AS pe
        ON pe.program_id = p.program_id
       AND (pe.is_deleted = 0 OR pe.is_deleted IS NULL)
      LEFT JOIN exercises AS e
        ON e.exercise_id = pe.exercise_id
      WHERE p.program_id = ?
        AND TRIM(p.created_by) = TRIM(?)
        AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
      GROUP BY p.program_id
    `;
    await pool.query("SET SESSION group_concat_max_len = 100000");
    const [rows] = await pool.query(sql, [userId, programId, userId]);

    if (rows.length === 0) return callback('Program not found');
    callback(null, rows[0]);
  } catch (err) {
    console.error('Error fetching program details:', err);
    callback('An error occurred while fetching program details');
  }
},

createWorkoutForExercise: async ({
    userId,
    programId,
    programExerciseId,
    exerciseId,     // optional – nếu không truyền, sẽ tra từ program_exercises
    note = '',
    sets = [],
  }) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Lấy exercise_id nếu thiếu + đảm bảo program_exercise thuộc đúng program
      let exId = exerciseId;
      if (!exId) {
        const [rows] = await conn.query(
          `SELECT exercise_id
             FROM program_exercises
            WHERE program_exercise_id = ?
              AND program_id = ?
              AND (is_deleted = 0 OR is_deleted IS NULL)
            LIMIT 1`,
          [programExerciseId, programId]
        );
        if (!rows.length) {
          throw new Error('Program exercise not found');
        }
        exId = rows[0].exercise_id;
      }

      // Lưu workout
      const [result] = await conn.query(
        `INSERT INTO training_data
           (sets, note, created_at, updated_at, program_exercise_id, user_id, exercise_id)
         VALUES
           (CAST(? AS JSON), ?, NOW(), NOW(), ?, ?, ?)`,
        [JSON.stringify(sets), note, programExerciseId, userId, exId]
      );

      const training_data_id = result.insertId;

      // Lấy record vừa tạo (trả về cho FE)
      const [saved] = await conn.query(
        `SELECT training_data_id, sets, note, created_at, updated_at,
                program_exercise_id, user_id, exercise_id
           FROM training_data
          WHERE training_data_id = ?`,
        [training_data_id]
      );

      await conn.commit();
      return saved[0];
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  },



};

export default ProgramModel;
