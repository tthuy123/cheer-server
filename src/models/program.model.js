import pool from '../config/db.connect.js';
import { v4 as uuidv4 } from 'uuid';

const ProgramModel = {
    listAllProgramsOfUser: async (userId, callback) => {
        try {
            const query = `
        SELECT p.program_id, p.name, p.type, p.created_at, p.updated_at
        FROM programs p
        JOIN users ON p.created_by  = users.user_id
        WHERE users.user_id = ?`;
            const [rows] = await pool.query(query, [userId]);
            callback(null, rows);
        } catch (error) {
            console.error('Error fetching programs:', error);
            callback('An error occurred while fetching programs');
        }
    },
    
    createProgram: async (userId, programData, callback) => {
        try {
            const programId = uuidv4();
            const query = `
                INSERT INTO programs (program_id, name, description, created_at, updated_at)
                VALUES (?, ?, ?, NOW(), NOW())`;
            await pool.query(query, [programId, programData.name, programData.description]);
            const userProgramQuery = `
                INSERT INTO user_programs (user_id, program_id)
                VALUES (?, ?)`;
            await pool.query(userProgramQuery, [userId, programId]);
            callback(null, { program_id: programId, ...programData });
        } catch (error) {
            console.error('Error creating program:', error);
            callback('An error occurred while creating the program');
        }
    },
    getProgramById: async (programId, callback) => {
        try {
            const query = `SELECT * FROM programs WHERE program_id = ?`;
            const [rows] = await pool.query(query, [programId]);
            if (rows.length === 0) {
                return callback('Program not found');
            }
            callback(null, rows[0]);
        } catch (error) {
            console.error('Error fetching program:', error);
            callback('An error occurred while fetching the program');
        }
    },
    updateProgram: async (programId, programData, callback) => {
        try {
            const query = `
                UPDATE programs
                SET name = ?, description = ?, updated_at = NOW()
                WHERE program_id = ?`;
            const [result] = await pool.query(query, [programData.name, programData.description, programId]);
            if (result.affectedRows === 0) {
                return callback('Program not found or no changes made');
            }
            callback(null, { message: 'Program updated successfully' });
        } catch (error) {
            console.error('Error updating program:', error);
            callback('An error occurred while updating the program');
        }
    },
    deleteProgram: async (programId, callback) => {
        try {
            await pool.query(deleteUserProgramsQuery, [programId]);
            const deleteProgramQuery = `DELETE FROM programs WHERE program_id = ?`;
            const [result] = await pool.query(deleteProgramQuery, [programId]);
            if (result.affectedRows === 0) {
                return callback('Program not found');
            }
            callback(null, { message: 'Program deleted successfully' });
        } catch (error) {
            console.error('Error deleting program:', error);
            callback('An error occurred while deleting the program');
        }
    }
};

export default ProgramModel;
