import express from 'express';
import cors from 'cors';
import { db } from './config/db';

import authRoutes from './auth/auth.routes';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);

app.get('/health', (_, res) => {

  checkDB()
  res.json({ status: 'ok' });
});


export async function checkDB() {

      const client = await db.connect();

      console.log(" ✅ PostgreSQL connected");
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
}

export default app;
