import { Pool } from 'pg';
import process = require('process');

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});

 

export const connectDB = async () => {
  try {
    const client = await db.connect();
    console.log("✅ PostgreSQL connected");
    console.log("DATABASE_URL = ", process.env.DATABASE_URL);

    const result = await client.query(`
      SELECT 
      current_database() AS db,
      current_schema() AS schema,
      current_user AS user
    `);

    console.log("🧠 DB INFO:", result.rows[0]);

    console.log("📋 Tables in database:");
    result.rows.forEach(row => {
      console.log(`- ${row.table_schema}.${row.table_name}`);
    });


    client.release();
  } catch (error) {
    console.error("❌ PostgreSQL connection failed", error);
    process.exit(1);
  }
};