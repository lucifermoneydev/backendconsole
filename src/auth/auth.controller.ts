import { Request, Response } from 'express';
import { db } from '../config/db';
import { hashPassword, verifyPassword } from '../utils/hash';
import {
  signAccessToken,
  signRefreshToken,
  signTempToken
} from '../utils/jwt';
import { generateOTP } from './otp';


/* =========================
   Test API CheckDB
========================= */

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

/* =========================
   SIGNUP
========================= */
export async function signup(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Missing email or password' });
  }

  const existing:any = await db.query(
    'SELECT id FROM public.users WHERE email = $1',
    [email]
  );

  if (existing.rowCount > 0) {
    return res.status(409).json({ message: 'Email already registered' });
  }

  const passwordHash = await hashPassword(password);
  const otp = generateOTP();

  const userResult = await db.query(
    `
    INSERT INTO public.users (email, password_hash, email_verified)
    VALUES ($1, $2, false)
    RETURNING id
    `,
    [email, passwordHash]
  );

  const userId = userResult.rows[0].id;

  await db.query(
    `
    INSERT INTO email_verifications (user_id, code)
    VALUES ($1, $2)
    `,
    [userId, otp]
  );

  // TODO: send email with OTP
  console.log('EMAIL OTP:', otp);

  const tempToken = signTempToken({ userId });

  res.status(201).json({
    requiresVerification: true,
    tempToken
  });
}

/* =========================
   VERIFY EMAIL
========================= */
export async function verifyEmail(req: Request, res: Response) {
  const authHeader = req.headers.authorization;
  const { code } = req.body;

  if (!authHeader || !code) {
    return res.status(400).json({ message: 'Invalid request' });
  }

  const token = authHeader.split(' ')[1];

  let payload: any;
  try {
    payload = require('jsonwebtoken').verify(
      token,
      process.env.JWT_SECRET!
    );
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }

  const { userId } = payload;

  const record = await db.query(
    `
    SELECT * FROM email_verifications
    WHERE user_id = $1 AND code = $2
    `,
    [userId, code]
  );

  if (record.rowCount === 0) {
    return res.status(400).json({ message: 'Invalid verification code' });
  }

  await db.query(
    `UPDATE users SET email_verified = true WHERE id = $1`,
    [userId]
  );

  await db.query(
    `DELETE FROM email_verifications WHERE user_id = $1`,
    [userId]
  );

  const accessToken = signAccessToken({ userId });
  const refreshToken = signRefreshToken({ userId });

  res.json({
    accessToken,
    refreshToken
  });
}

/* =========================
   LOGIN
========================= */
export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  const result = await db.query(
    `
    SELECT id, password_hash, email_verified, role
    FROM users
    WHERE email = $1
    `,
    [email]
  );

  if (result.rowCount === 0) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const user = result.rows[0];

  const valid = await verifyPassword(password, user.password_hash);

  if (!valid) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  if (!user.email_verified) {
    return res.status(403).json({
      message: 'Email not verified',
      requiresVerification: true
    });
  }

  const accessToken = signAccessToken({ userId: user.id });
  const refreshToken = signRefreshToken({ userId: user.id });

  res.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      role: user.role
    }
  });
}
