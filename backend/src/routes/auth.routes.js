
import { Router } from 'express';
import { promisify } from 'node:util';
import {
  scrypt as scryptCallback,
  timingSafeEqual,
  createHmac
} from 'node:crypto';
import bcrypt from 'bcryptjs';
import { database } from '../config/database.js';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  deleteStoredReportPhoto,
  prepareReportPhoto,
  publicReportPhotoPath,
  reportPhotoUpload,
  storePreparedReportPhoto
} from '../services/report-photo.service.js';

const router = Router();
const scrypt = promisify(scryptCallback);

const emailPattern = /^\S+@\S+\.\S+$/;
const tokenLifetimeSeconds = 60 * 60 * 8;
const optionalProfileColumns = ['phone', 'student_id', 'course', 'profile_photo_url'];

// Return safe user information
function publicUser(user) {
  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    role: user.role,
    phone: user.phone ?? null,
    studentId: user.student_id ?? null,
    course: user.course ?? null,
    profilePhotoUrl: user.profile_photo_url ?? null
  };
}

async function getProfileColumns() {
  const [rows] = await database.execute(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'users'
       AND COLUMN_NAME IN (?, ?, ?, ?)`,
    optionalProfileColumns
  );
  return new Set(rows.map((row) => row.COLUMN_NAME));
}

async function getUserProfile(userId, columns = null) {
  const available = columns ?? await getProfileColumns();
  const selectOptional = (column) => available.has(column) ? column : `NULL AS ${column}`;
  const [rows] = await database.execute(
    `SELECT id, full_name, email, role,
            ${selectOptional('phone')},
            ${selectOptional('student_id')},
            ${selectOptional('course')},
            ${selectOptional('profile_photo_url')}
     FROM users WHERE id = ? LIMIT 1`,
    [userId]
  );
  return rows[0] ?? null;
}

// Hash passwords before storing them
async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

// Verify passwords
async function verifyPassword(password, storedHash) {
  if (/^\$2[aby]\$/.test(storedHash)) {
    return bcrypt.compare(password, storedHash);
  }

  // Support older scrypt password hashes
  const [algorithm, salt, hashHex] = String(storedHash).split('$');

  if (
    algorithm !== 'scrypt' ||
    !salt ||
    !hashHex ||
    !/^[a-f0-9]+$/i.test(hashHex)
  ) {
    return false;
  }

  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scrypt(password, salt, expected.length);

  return (
    expected.length === actual.length &&
    timingSafeEqual(expected, actual)
  );
}

// Generate JWT authentication token
function signToken(user) {
  const secret =
    process.env.JWT_SECRET ||
    (process.env.NODE_ENV === 'production'
      ? ''
      : 'local-development-only-change-this-secret');

  if (!secret) {
    throw new Error('Set JWT_SECRET before starting the API in production.');
  }

  const now = Math.floor(Date.now() / 1000);

  const header = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' })
  ).toString('base64url');

  const payload = Buffer.from(
    JSON.stringify({
      sub: String(user.id),
      role: user.role,
      ver: Number(user.token_version ?? 0),
      iat: now,
      exp: now + tokenLifetimeSeconds
    })
  ).toString('base64url');

  const content = `${header}.${payload}`;

  const signature = createHmac('sha256', secret)
    .update(content)
    .digest('base64url');

  return `${content}.${signature}`;
}

// STUDENT REGISTRATION
router.post('/register', async (request, response, next) => {
  const fullName =
    typeof request.body.fullName === 'string'
      ? request.body.fullName.trim()
      : '';

  const email =
    typeof request.body.email === 'string'
      ? request.body.email.trim().toLowerCase()
      : '';

  const password =
    typeof request.body.password === 'string'
      ? request.body.password
      : '';

  if (fullName.length < 2 || fullName.length > 120) {
    return response.status(400).json({
      message: 'Enter a name between 2 and 120 characters.'
    });
  }

  if (!emailPattern.test(email) || email.length > 254) {
    return response.status(400).json({
      message: 'Enter a valid email address.'
    });
  }

  if (password.length < 8 || password.length > 128) {
    return response.status(400).json({
      message: 'Password must be between 8 and 128 characters.'
    });
  }

  try {
    const passwordHash = await hashPassword(password);

    const [result] = await database.execute(
      `INSERT INTO users (full_name, email, password_hash)
       VALUES (?, ?, ?)`,
      [fullName, email, passwordHash]
    );

    const user = {
      id: result.insertId,
      full_name: fullName,
      email,
      role: 'STUDENT',
      token_version: 0
    };

    return response.status(201).json({
      token: signToken(user),
      user: publicUser(user)
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return response.status(409).json({
        message: 'An account with that email already exists.'
      });
    }

    return next(error);
  }
});

// STUDENT AND ADMIN LOGIN
router.post('/login', async (request, response, next) => {
  const email =
    typeof request.body.email === 'string'
      ? request.body.email.trim().toLowerCase()
      : '';

  const password =
    typeof request.body.password === 'string'
      ? request.body.password
      : '';

  if (!emailPattern.test(email) || !password) {
    return response.status(400).json({
      message: 'Enter a valid email address and password.'
    });
  }

  try {
    const [rows] = await database.execute(
      `SELECT id, full_name, email, password_hash, role, token_version
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    const user = rows[0];

    if (
      !user ||
      !(await verifyPassword(password, user.password_hash))
    ) {
      return response.status(401).json({
        message: 'Email or password is incorrect.'
      });
    }

    return response.json({
      token: signToken(user),
      user: publicUser(user)
    });
  } catch (error) {
    return next(error);
  }
});

// GET CURRENTLY LOGGED-IN USER
router.get('/me', authenticate, async (request, response, next) => {
  try {
    const user = await getUserProfile(request.user.id);
    if (!user) {
      return response.status(404).json({
        message: 'User account not found.'
      });
    }

    return response.json({
      user: publicUser(user)
    });
  } catch (error) {
    return next(error);
  }
});

router.patch('/profile', authenticate, reportPhotoUpload, async (request, response, next) => {
  const body = request.body;
  const allowedFields = ['fullName', 'phone', 'studentId', 'course', 'profilePhotoUrl'];
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).some((field) => !allowedFields.includes(field)) ||
      typeof body.fullName !== 'string') {
    return response.status(400).json({ message: 'Submit a full name and supported profile fields.' });
  }

  const fullName = body.fullName.trim();
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const studentId = typeof body.studentId === 'string' ? body.studentId.trim() : '';
  const course = typeof body.course === 'string' ? body.course.trim() : '';
  const submittedProfilePhotoUrl = request.file
    ? ''
    : typeof body.profilePhotoUrl === 'string' ? body.profilePhotoUrl.trim() : '';
  let profilePhotoUrl = submittedProfilePhotoUrl;

  if (fullName.length < 2 || fullName.length > 120) {
    return response.status(400).json({ message: 'Enter a name between 2 and 120 characters.' });
  }
  if (phone.length > 30 || studentId.length > 40 || course.length > 120 || submittedProfilePhotoUrl.length > 2048) {
    return response.status(400).json({ message: 'One or more profile fields are too long.' });
  }
  if (submittedProfilePhotoUrl) {
    try {
      const url = new URL(submittedProfilePhotoUrl);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid scheme');
    } catch {
      return response.status(400).json({ message: 'Enter a valid HTTP or HTTPS profile photo URL.' });
    }
  }

  let storedPhotoFilename = null;
  let profileUpdateCommitted = false;
  try {
    const columns = await getProfileColumns();
    const valuesByColumn = {
      phone: phone || null,
      student_id: studentId || null,
      course: course || null,
      profile_photo_url: submittedProfilePhotoUrl || null
    };
    const requestedProfileValues = {
      phone,
      student_id: studentId,
      course,
      profile_photo_url: request.file ? 'uploaded photo' : submittedProfilePhotoUrl
    };
    const missingFields = Object.entries(requestedProfileValues)
      .filter(([column, value]) => value && !columns.has(column))
      .map(([column]) => column);

    if (missingFields.length) {
      return response.status(409).json({
        message: 'The profile database migration is missing. Ask an administrator to apply database/migrations/20261120_add_user_profile_fields.sql, then try again.'
      });
    }

    const previousProfile = await getUserProfile(request.user.id, columns);
    if (request.file) {
      const preparedPhoto = await prepareReportPhoto(request.file);
      storedPhotoFilename = await storePreparedReportPhoto(preparedPhoto);
      profilePhotoUrl = publicReportPhotoPath(storedPhotoFilename);
      valuesByColumn.profile_photo_url = profilePhotoUrl;
    }

    const updates = ['full_name = ?'];
    const values = [fullName];
    for (const column of optionalProfileColumns) {
      if (columns.has(column)) {
        updates.push(`${column} = ?`);
        values.push(valuesByColumn[column]);
      }
    }
    values.push(request.user.id);

    await database.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    profileUpdateCommitted = true;
    const user = await getUserProfile(request.user.id, columns);
    if (storedPhotoFilename && previousProfile?.profile_photo_url?.startsWith('/uploads/reports/')) {
      await deleteStoredReportPhoto(previousProfile.profile_photo_url.slice('/uploads/reports/'.length));
    }
    return response.json({ user: publicUser(user), message: 'Profile updated successfully.' });
  } catch (error) {
    if (storedPhotoFilename && !profileUpdateCommitted) {
      await deleteStoredReportPhoto(storedPhotoFilename).catch(() => {});
    }
    return next(error);
  }
});

router.get('/summary', authenticate, async (request, response, next) => {
  try {
    const [rows] = await database.execute(
      `SELECT
         (SELECT COUNT(*) FROM reports WHERE reporter_id = ?) AS my_reports,
         (SELECT COUNT(*) FROM claims WHERE claimant_id = ?) AS my_claims,
         (SELECT COUNT(*) FROM reports WHERE reporter_id = ? AND report_type = 'FOUND') AS found_items`,
      [request.user.id, request.user.id, request.user.id]
    );
    return response.json({
      summary: {
        myReports: Number(rows[0].my_reports),
        myClaims: Number(rows[0].my_claims),
        foundItems: Number(rows[0].found_items)
      }
    });
  } catch (error) {
    return next(error);
  }
});

// LOG OUT AND INVALIDATE THE CURRENT TOKEN
router.post('/logout', authenticate, async (request, response, next) => {
  try {
    await database.execute(
      `UPDATE users
       SET token_version = token_version + 1
       WHERE id = ?`,
      [request.user.id]
    );

    return response.json({
      message: 'Logged out successfully.'
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
