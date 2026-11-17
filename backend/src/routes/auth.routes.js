import { Router } from 'express';
import { promisify } from 'node:util';
import { scrypt as scryptCallback, timingSafeEqual, createHmac } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { database } from '../config/database.js';

const router = Router();
const scrypt = promisify(scryptCallback);
const emailPattern = /^\S+@\S+\.\S+$/;
const tokenLifetimeSeconds = 60 * 60 * 8;

function publicUser(user) {
  return { id: user.id, fullName: user.full_name, email: user.email, role: user.role };
}

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function verifyPassword(password, storedHash) {
  if (/^\$2[aby]\$/.test(storedHash)) return bcrypt.compare(password, storedHash);
  const [algorithm, salt, hashHex] = String(storedHash).split('$');
  if (algorithm !== 'scrypt' || !salt || !hashHex || !/^[a-f0-9]+$/i.test(hashHex)) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scrypt(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function signToken(user) {
  const secret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'local-development-only-change-this-secret');
  if (!secret) throw new Error('Set JWT_SECRET before starting the API in production.');
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: String(user.id), role: user.role, iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + tokenLifetimeSeconds,
  })).toString('base64url');
  const content = `${header}.${payload}`;
  const signature = createHmac('sha256', secret).update(content).digest('base64url');
  return `${content}.${signature}`;
}

router.post('/register', async (request, response, next) => {
  const fullName = typeof request.body.fullName === 'string' ? request.body.fullName.trim() : '';
  const email = typeof request.body.email === 'string' ? request.body.email.trim().toLowerCase() : '';
  const password = typeof request.body.password === 'string' ? request.body.password : '';

  if (fullName.length < 2 || fullName.length > 120) {
    return response.status(400).json({ message: 'Enter a name between 2 and 120 characters.' });
  }
  if (!emailPattern.test(email) || email.length > 254) {
    return response.status(400).json({ message: 'Enter a valid email address.' });
  }
  if (password.length < 8 || password.length > 128) {
    return response.status(400).json({ message: 'Password must be between 8 and 128 characters.' });
  }

  try {
    const passwordHash = await hashPassword(password);
    const [result] = await database.execute(
      'INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)',
      [fullName, email, passwordHash],
    );
    const user = { id: result.insertId, full_name: fullName, email, role: 'STUDENT' };
    return response.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return response.status(409).json({ message: 'An account with that email already exists.' });
    }
    return next(error);
  }
});

router.post('/login', async (request, response, next) => {
  const email = typeof request.body.email === 'string' ? request.body.email.trim().toLowerCase() : '';
  const password = typeof request.body.password === 'string' ? request.body.password : '';
  if (!emailPattern.test(email) || !password) {
    return response.status(400).json({ message: 'Enter a valid email address and password.' });
  }

  try {
    const [rows] = await database.execute(
      'SELECT id, full_name, email, password_hash, role FROM users WHERE email = ? LIMIT 1',
      [email],
    );
    const user = rows[0];
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return response.status(401).json({ message: 'Email or password is incorrect.' });
    }
    return response.json({ token: signToken(user), user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

export default router;
