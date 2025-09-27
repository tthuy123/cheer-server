import mysql from "mysql2/promise";

async function testConnection() {
  try {
    const conn = await mysql.createConnection({
      host: "localhost",
      user: "admin",
      password: "thuy130613",
      database: "cheer"
    });

    console.log("✅ Connected to MySQL!");
    const [rows] = await conn.query("SELECT NOW() as now");
    console.log("DB Time:", rows[0].now);

    await conn.end();
  } catch (err) {
    console.error("❌ Connection failed:", err.message);
  }
}

testConnection();
