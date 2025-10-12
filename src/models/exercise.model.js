import pool from '../config/db.connect.js';

const ExerciseModel = {
    listAllExercises: async (page = 1, callback) => {
        try {
            const limit = 10;
            const offset = (page - 1) * limit;

            const query = 'SELECT * FROM exercises LIMIT ? OFFSET ?';
            const [rows] = await pool.query(query, [limit, offset]);

            callback(null, rows);
        } catch (error) {
            console.error('Error fetching exercises:', error);
            callback('An error occurred while fetching exercises');
        }
        },
    listAllExercisesOfProgram: async (programId, callback) => {
        try {
            const query = `
        SELECT e.exercise_id, e.name, e.description, e.created_at, e.updated_at
        FROM exercises e
        JOIN program_exercises pe ON e.exercise_id = pe.exercise_id
        WHERE pe.program_id = ?`;
            const [rows] = await pool.query(query, [programId]);
            callback(null, rows);
        } catch (error) {
            console.error('Error fetching exercises:', error);
            callback('An error occurred while fetching exercises');
        }
    },
    searchExercisesByName: async (name, callback) => {
        try {
            const query = 'SELECT * FROM exercises WHERE name LIKE ?';
            const [rows] = await pool.query(query, [`%${name}%`]);
            callback(null, rows);
        } catch (error) {
            console.error('Error searching exercises:', error);
            callback('An error occurred while searching exercises');
        }
    },
    getExerciseById: async (id, callback) => {
        try {
            const query = 'SELECT * FROM exercises WHERE exercise_id = ?';
            const [rows] = await pool.query(query, [id]);
            if (rows.length === 0) {
                return callback('Exercise not found');
            }
            callback(null, rows[0]);
        } catch (error) {
            console.error('Error fetching exercise:', error);
            callback('An error occurred while fetching the exercise');
        }
    },
};

export default ExerciseModel;
