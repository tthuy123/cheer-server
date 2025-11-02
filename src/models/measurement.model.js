// measurement.model.js
import pool from '../config/db.connect.js';

const MeasurementModel = {
    listAllMeasurements: async (callback) => { // Giữ nguyên async/callback
        const sql = `SELECT * FROM measurements`;
        try {
            const [rows] = await pool.query(sql); // await BÊN TRONG hàm async
            callback(null, rows);
        } catch (error) {
            console.error('Error fetching measurements:', error);
            callback('An error occurred while fetching measurements', null);
        }
    },
    listAtheleteOfACoach: async (coachId, callback) => {
        const sql = `
        SELECT
            up.first_name,
            up.last_name,
            u.email,
            u.user_id as id
        FROM
            coach_student AS cs
        JOIN
            users AS u ON cs.athlete_id = u.user_id
        JOIN
            user_profiles AS up ON u.profile_id = up.profile_id
        WHERE
            cs.coach_id = ?;
        `;
        try {
            const [rows] = await pool.query(sql, [coachId]);
            callback(null, rows);
        } catch (error) {
            console.error('Error fetching athletes for coach:', error);
            callback('An error occurred while fetching athletes', null);
        }
    },
  setNewRecord: async (measurementData, callback) => {
    // Đổi tên biến để rõ ràng hơn, khớp với schema
    const { athleteId, measurementId, value, dateRecorded } = measurementData;
    
    // Ghi chú: Tên biến 'measurementType' từ code cũ của bạn
    // được giả định là 'measurementId' để khớp với khóa ngoại trong schema.
    // Tên biến 'value' được giả định là 'result'.

    const sql = `
    INSERT INTO measurement_sessions (
        athlete_id,
        measurement_id,
        result,
        status,
        measurement_unit,
        created_at,
        updated_at
    )
    SELECT
        ? AS athlete_id,                     -- Tham số 1: athleteId
        ? AS measurement_id,                 -- Tham số 2: measurementId
        ? AS result,                         -- Tham số 3: value (kết quả)
        1 AS status,                         -- Yêu cầu: status mặc định là 1
        m.imperial_unit AS measurement_unit, -- Yêu cầu: lấy từ bảng measurements
        COALESCE(?, CURRENT_TIMESTAMP) AS created_at, -- Tham số 4: dateRecorded
        COALESCE(?, CURRENT_TIMESTAMP) AS updated_at  -- Tham số 5: dateRecorded
    FROM
        measurements AS m
    WHERE
        m.measurement_id = ?;                -- Tham số 6: measurementId (để tìm đúng unit)
    `;
    
    // Các tham số phải được sắp xếp đúng thứ tự của các dấu '?'
    const params = [
        athleteId,
        measurementId,
        value,
        dateRecorded,    // Cho created_at
        dateRecorded,    // Cho updated_at
        measurementId    // Cho mệnh đề WHERE
    ];

    try {
        const [result] = await pool.query(sql, params);
        callback(null, result);
    } catch (error) {
        // Cập nhật thông báo lỗi cho rõ ràng
        console.error('Error inserting new measurement session:', error);
        callback('An error occurred while inserting the measurement session', null);
    }
},
    getTeamLeaderboard: async (coachId) => {
  
    const sql = `
    SELECT
        m.measurement_id,
        m.name AS measurement_name,
        m.imperial_unit,
        up.first_name,
        up.last_name,
        T.best_result
    FROM (
        -- Bảng tạm T: Lấy thành tích TỐT NHẤT (MIN) cho mỗi athlete, mỗi measurement
        SELECT
            ms.measurement_id,
            ms.athlete_id,
            MIN(ms.result) AS best_result 
        FROM
            measurement_sessions AS ms
        JOIN
            -- Lọc ra các athlete thuộc team của coach này
            coach_student AS cs ON ms.athlete_id = cs.athlete_id
        WHERE
            cs.coach_id = ? -- Tham số [1]: coachId
            AND cs.status = 1
            AND ms.result IS NOT NULL -- Bỏ qua các kết quả rỗng
        GROUP BY
            ms.measurement_id, ms.athlete_id
    ) AS T
    -- Join với các bảng khác để lấy tên
    JOIN
        measurements AS m ON T.measurement_id = m.measurement_id
    JOIN
        users AS u ON T.athlete_id = u.user_id
    JOIN
        user_profiles AS up ON u.profile_id = up.profile_id
    WHERE 
        u.is_active = 1 -- Đảm bảo tài khoản user đang hoạt động
    ORDER BY
        m.name, -- Gom nhóm các measurement lại với nhau
        T.best_result DESC; -- Sắp xếp theo thành tích (DESC - cao là tốt nhất)
    `;
    
    try {
        // [rows] là một mảng phẳng (flat array) chứa tất cả kết quả
        const [rows] = await pool.query(sql, [coachId]);
        return rows;
    } catch (error) {
        console.error('Error fetching team leaderboard:', error);
        throw new Error('Lỗi khi truy vấn bảng xếp hạng đội');
    }
},
getAthleteProgress: async (athleteId, measurementId) => {
    // Query này lấy tất cả các bản ghi, sắp xếp từ MỚI NHẤT đến CŨ NHẤT.
    // Điều này rất quan trọng để tính toán "Latest Result".
    const sql = `
    SELECT
        ms.result,
        ms.created_at AS date,
        ms.measurement_unit AS unit
    FROM
        measurement_sessions AS ms
    WHERE
        ms.athlete_id = ?        -- Tham số [1]: athleteId
        AND ms.measurement_id = ?  -- Tham số [2]: measurementId
        AND ms.result IS NOT NULL    -- Chỉ lấy các bản ghi có kết quả
    ORDER BY
        ms.created_at DESC; -- Sắp xếp theo ngày, MỚI NHẤT ĐẦU TIÊN
    `;
    
    try {
        const [rows] = await pool.query(sql, [athleteId, measurementId]);
        // Trả về một mảng các kết quả, ví dụ:
        // [
        //   { result: 3294, date: '2025-09-18...', unit: 'seconds' }, // Mới nhất
        //   { result: 5999, date: '2025-09-17...', unit: 'seconds' },
        //   { result: 5999, date: '2025-09-17...', unit: 'seconds' }  // Cũ nhất
        // ]
        return rows;
    } catch (error) {
        console.error('Error fetching athlete progress:', error);
        throw new Error('Lỗi khi truy vấn lịch sử đo lường');
    }
}
};
export default MeasurementModel; // Export đối tượng