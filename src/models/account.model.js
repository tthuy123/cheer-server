import pool from "../config/db.connect.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

const AccountModel = {
  login: async (email, password, callback) => {
  try {
    const query = `SELECT * FROM users WHERE email = ?`;
    const [rows] = await pool.query(query, [email]);

    if (rows.length === 0) {
      return callback("Invalid email or password");
    }

    const user = rows[0];

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return callback("Invalid email or password");
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.user_id, account_type: user.account_type },
      process.env.TOKEN_SECRET_KEY,
      { expiresIn: "24h" }
    );

    // Trả về thông tin user
    callback(null, {
      auth: true,
      token: token,
      account_type: user.account_type,
      user_id: user.user_id,
      email: user.email,
      profile_id: user.profile_id,
      is_active: user.is_active
    });
  } catch (error) {
    console.error("Login error:", error);
    callback("An error occurred during login");
  }
}
,

  signup: async (userData, callback) => {
  const { email, password, account_type = "athlete", profile_id = null } = userData;
  try {
    // Kiểm tra email đã tồn tại chưa
    const query = `SELECT * FROM users WHERE email = ?`;
    const [rows] = await pool.query(query, [email]);
    if (rows.length > 0) {
      return callback("Email already registered");
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Tạo UUID cho user_id
    const userId = uuidv4();

    // Insert user
    const insertQuery = `
      INSERT INTO users 
      (user_id, account_type, email, password_hash, is_active, created_at, updated_at, profile_id) 
      VALUES (?, ?, ?, ?, ?, NOW(), NOW(), ?)
    `;
    await pool.query(insertQuery, [
      userId,
      account_type,
      email,
      hashedPassword,
      1, // is_active = true
      profile_id,
    ]);

    return callback(null, {
      message: "User created successfully",
      success: true,
      user_id: userId,
    });
  } catch (error) {
    console.error(error);
    return callback("Signup failed");
  }
},
  getUserByUsername: async (username, callback) => {
    const query = `SELECT * FROM users WHERE username = ?`;
    try {
      const [result] = await pool.query(query, [username]);
      callback(null, result); // Pass the result to the callback
    } catch (error) {
      callback(error); // Pass the error to the callback
    }
  },
  getUserByID: async (id, callback) => {
    const query = `SELECT * FROM users WHERE id = ?`;
    try {
      const [result] = await pool.query(query, [id]);
      callback(null, result); // Pass the result to the callback
    } catch (error) {
      callback(error); // Pass the error to the callback
    }
  },
  getAllUsers: async (callback) => {
    const query = `SELECT * FROM users`;
    try {
      const [result] = await pool.query(query);
      callback(null, result); // Pass the result to the callback
    } catch (error) {
      callback(error); // Pass the error to the callback
    }
  },

  deleteUserByUsername: async (username, callback) => {
    const check = `SELECT * FROM users WHERE username = ?`;
    const [user] = await pool.query(check, [username]);
    if (user.length === 0) {
      return callback("User not found");
    } else {
      console.log("User found");
    }
    const query = `DELETE FROM users WHERE username = ?`;
    try {
      const [result] = await pool.query(query, [username]);
      callback(null, result); // Pass the result to the callback
    } catch (error) {
      callback(error); // Pass the error to the callback
    }
  },
  deleteUserById: async (id, callback) => {
    const check = `SELECT * FROM users WHERE id = ?`;
    const [user] = await pool.query(check, [id]);
    if (user.length === 0) {
      return callback("User not found");
    }

    const deletePlaylists = `DELETE FROM playlists WHERE creator_id = ?`;
    const deleteUser = `DELETE FROM users WHERE id = ?`;

    try {
      await pool.query("START TRANSACTION");
      await pool.query(deletePlaylists, [id]);
      const [result] = await pool.query(deleteUser, [id]);
      await pool.query("COMMIT");
      callback(null, result); // Pass the result to the callback
    } catch (error) {
      await pool.query("ROLLBACK");
      callback(error); // Pass the error to the callback
    }
  },
  updateUser: async (id, userData) => {
    const { display_name, avatar, gender, bio, date_of_birth, phone, address } = userData;
  
    const query = `
        UPDATE users 
        SET 
            display_name = ?, 
            avatar = ?, 
            gender = ?, 
            bio = ?, 
            date_of_birth = ?, 
            phone = ?, 
            address = ?
        WHERE id = ?;
    `;
  
    try {
      const [result] = await pool.query(query, [
        display_name,
        avatar,
        gender,
        bio,
        date_of_birth,
        phone,
        address,
        id,
      ]);
  
      // Check if any row was updated
      if (result.affectedRows === 0) {
        throw new Error("User not found or no changes made");
      }
  
      // Return the updated user's data by fetching it again
      const fetchUpdatedUserQuery = `SELECT * FROM users WHERE id = ?`;
      const [updatedUser] = await pool.query(fetchUpdatedUserQuery, [id]);
  
      return updatedUser[0];
    } catch (error) {
      throw new Error(error.message); // Throw error for the controller to handle
    }
  },  
    changePassword: async (id, oldPassword, newPassword) => {
        const getPasswordQuery = `SELECT password FROM users WHERE id = ?`;
        const updatePasswordQuery = `UPDATE users SET password = ? WHERE id = ?`;
    
        try {
            // Lấy mật khẩu hiện tại từ cơ sở dữ liệu
            const [result] = await pool.query(getPasswordQuery, [id]);
            if (result.length === 0) {
                throw new Error("User not found");
            }
    
            const currentPassword = result[0].password;
    
            // Kiểm tra oldPassword có khớp không
            const isMatch = await bcrypt.compare(oldPassword, currentPassword);
            if (!isMatch) {
                throw new Error("Old password is incorrect");
            }
    
            // Nếu mật khẩu khớp, băm newPassword và cập nhật
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);
            await pool.query(updatePasswordQuery, [hashedPassword, id]);
    
            return { success: true, message: "Password updated successfully" };
        } catch (error) {
            throw new Error(error.message);
        }
    },
    
};
export default AccountModel;