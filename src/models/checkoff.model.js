// measurement.model.js
import pool from '../config/db.connect.js';

const CheckoffModel = {
     create: async (checkoffData, callback) => {
    const {
      assigned_date,
      due_date,
      status,
      coach_id,
      assigned_task,
      note,
      receivers, // Mảng userId: ['uuid1', 'uuid2', ...]
    } = checkoffData;

    const insertCheckoffSQL = `
      INSERT INTO new_checkoff (
        assigned_date,
        due_date,
        status,
        coach_id,
        assigned_task,
        note,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW());
    `;

    try {
      const [checkoffResult] = await pool.query(insertCheckoffSQL, [
        assigned_date || null,
        due_date || null,
        status || 0,
        coach_id,
        assigned_task || null,
        note || null,
      ]);

      const checkoffId = checkoffResult.insertId;

      if (Array.isArray(receivers) && receivers.length > 0) {
        const insertReceiverSQL = `
          INSERT INTO new_checkoff_receivers_users (newCheckoffCheckoffId, usersUserId)
          VALUES ?;
        `;
        const values = receivers.map((userId) => [checkoffId, userId]);
        await pool.query(insertReceiverSQL, [values]);
      }

      callback(null, {
        message: 'Checkoff created successfully',
        checkoffId,
        receiversCount: receivers?.length || 0,
      });
    } catch (error) {
      console.error('Error creating new checkoff:', error);
      callback('An error occurred while creating the checkoff', null);
        }
    },
  getCheckoffSubmitByCoach: async (coachId, callback) => {
    const sql = `
      SELECT
        sc.submit_id,
        sc.checkoff_id,
        sc.coach_id,
        sc.athlete_id,
        sc.due_date,
        sc.submitted_date,
        sc.media_link,
        sc.note,
        sc.status_objective,
        sc.status_review_date,
        sc.status,
        sc.coach_review_note,
        sc.created_at,
        sc.updated_at,
        -- tên VĐV từ bảng users
        u.first_name,
        u.last_name,
        CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) AS athlete_name,
        -- tên task (nếu muốn)
        nc.assigned_task
      FROM student_checkoff AS sc
      LEFT JOIN users AS u1
        ON u1.user_id = sc.athlete_id
      LEFT JOIN new_checkoff AS nc
        ON nc.checkoff_id = sc.checkoff_id
      LEFT JOIN user_profiles AS u
        ON u.profile_id = u1.profile_id
      WHERE sc.coach_id = ?
      -- sắp xếp: bản đã nộp sớm nhất lên trước, các bản chưa nộp (NULL) xuống cuối
      ORDER BY 
        sc.submitted_date IS NULL ASC,    -- false(0)=đã nộp -> lên trước; true(1)=NULL -> xuống sau
        sc.submitted_date ASC,
        sc.created_at ASC
    `;

    try {
      const [rows] = await pool.query(sql, [coachId]);
      callback(null, rows);  // trả toàn bộ danh sách (không lấy rows[0] nữa)
    } catch (error) {
      console.error('Error fetching student checkoff by coach:', error);
      callback('An error occurred while fetching student checkoff by coach', null);
    }
  },

  // 🔹 COACH THÊM NHẬN XÉT CHO SUBMIT_ID CỤ THỂ
  addCoachComment: async (submitId, coachId, comment, status, callback) => {
  const sql = `
    UPDATE student_checkoff
    SET 
      coach_review_note = ?,
      status = ?,
      status_review_date = NOW(),
      updated_at = NOW()
    WHERE submit_id = ?
      AND coach_id = ?;
  `;

  try {
    const [result] = await pool.query(sql, [comment, status, submitId, coachId]);
    callback(null, { 
      message: 'Comment and status updated successfully', 
      affectedRows: result.affectedRows 
    });
  } catch (error) {
    console.error('Error adding coach comment:', error);
    callback('An error occurred while adding the comment', null);
  }
}

};
export default CheckoffModel;