import { randomBytes, scrypt } from 'node:crypto';
import { Router } from 'express';
import { database } from '../config/database.js';

const router = Router();
const passwordKeyLength = 64;

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');

  return new Promise((resolve, reject) => {
    scrypt(password, salt, passwordKeyLength, {
      N: 16384,
      r: 8,
      p: 1,
      maxmem: 64 * 1024 * 1024,
    }, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(`scrypt$16384$8$1$${salt}$${derivedKey.toString('hex')}`);
    });
  });
}

router.post('/register', async (request, response, next) => {
  const { fullName, email, password } = request.body ?? {};

  if (
    typeof fullName !== 'string'
    || typeof email !== 'string'
    || typeof password !== 'string'
  ) {
    response.status(400).json({ message: 'Enter your name, email address, and password.' });
    return;
  }

  const normalizedName = fullName.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const passwordLength = Array.from(password).length;

  if (normalizedName.length < 2 || normalizedName.length > 120) {
    response.status(400).json({ message: 'Your name must be between 2 and 120 characters.' });
    return;
  }

  if (
    normalizedEmail.length > 254
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
  ) {
    response.status(400).json({ message: 'Enter a valid email address.' });
    return;
  }

  if (passwordLength < 8 || passwordLength > 128) {
    response.status(400).json({ message: 'Your password must be between 8 and 128 characters.' });
    return;
  }

  try {
    const passwordHash = await hashPassword(password);
    const [result] = await database.execute(
      'INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)',
      [normalizedName, normalizedEmail, passwordHash],
    );

    response.status(201).json({
      message: 'Your account has been created.',
      user: {
        id: result.insertId.toString(),
        fullName: normalizedName,
        email: normalizedEmail,
        role: 'STUDENT',
      },
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      response.status(409).json({ message: 'An account with this email already exists.' });
      return;
    }

    if (
      ['ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND']
        .includes(error.code)
    ) {
      response.status(503).json({
        message: 'The account service cannot connect to MySQL. Check that MySQL is running and the DB settings in backend/.env are correct.',
      });
      return;
    }

    if (error.code === 'ER_NO_SUCH_TABLE') {
      response.status(503).json({
        message: 'The database tables are missing. Run database/schema.sql, then try again.',
      });
      return;
    }

    next(error);
  }
});

export default router;
