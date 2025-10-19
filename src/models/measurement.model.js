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
    }
};

export default MeasurementModel; // Export đối tượng