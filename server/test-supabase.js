require("dotenv").config();
const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL belum ada di server/.env");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

(async () => {
  try {
    const connection = await pool.query(
      "SELECT NOW() AS current_time"
    );

    console.log("✅ Supabase PostgreSQL terhubung.");
    console.log(
      "Database time:",
      connection.rows[0].current_time
    );

    const users = await pool.query(
      "SELECT COUNT(*) AS total FROM public.users"
    );

    const payments = await pool.query(
      "SELECT COUNT(*) AS total FROM public.payments"
    );

    console.log("Users:", users.rows[0].total);
    console.log("Payments:", payments.rows[0].total);

  } catch (error) {
    console.error("❌ Gagal terhubung ke Supabase.");
    console.error("Error:", error.message);
  } finally {
    await pool.end();
  }
})();
