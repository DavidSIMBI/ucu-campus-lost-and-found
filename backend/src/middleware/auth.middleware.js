
import { createHmac, timingSafeEqual } from 'node:crypto';
import { database } from '../config/database.js';

function getSecret() {
  const secret =
    process.env.JWT_SECRET ||
    (process.env.NODE_ENV === 'production'
      ? ''
      : 'local-development-only-change-this-secret');

  if (!secret) {
    throw new Error('JWT_SECRET is not configured.');
  }

  return secret;
}

// Verify whether the user has a valid login token
export async function authenticate(request, response, next) {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return response.status(401).json({
        message: 'Please log in to access this resource.'
      });
    }

    const token = authHeader.split(' ')[1];
    const parts = token.split('.');

    if (parts.length !== 3) {
      return response.status(401).json({
        message: 'Invalid authentication token.'
      });
    }

    const [headerPart, payloadPart, signaturePart] = parts;

    const header = JSON.parse(
      Buffer.from(headerPart, 'base64url').toString()
    );

    if (header.alg !== 'HS256' || header.typ !== 'JWT') {
      return response.status(401).json({
        message: 'Invalid authentication token.'
      });
    }

    const secret = getSecret();
    const content = `${headerPart}.${payloadPart}`;

    const expectedSignature = createHmac('sha256', secret)
      .update(content)
      .digest();

    const actualSignature = Buffer.from(
      signaturePart,
      'base64url'
    );

    if (
      actualSignature.length !== expectedSignature.length ||
      !timingSafeEqual(actualSignature, expectedSignature)
    ) {
      return response.status(401).json({
        message: 'Invalid authentication token.'
      });
    }

    const payload = JSON.parse(
      Buffer.from(payloadPart, 'base64url').toString()
    );

    if (
      !payload.sub ||
      !Number.isSafeInteger(Number(payload.sub)) ||
      !Number.isInteger(payload.exp) ||
      payload.exp <= Math.floor(Date.now() / 1000) ||
      !['STUDENT', 'ADMIN'].includes(payload.role) ||
      !Number.isInteger(payload.ver)
    ) {
      return response.status(401).json({
        message: 'Your session is invalid or has expired.'
      });
    }

    // Check the current account and token version in MySQL
    const [rows] = await database.execute(
      `SELECT id, role, token_version
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [Number(payload.sub)]
    );

    const user = rows[0];

    if (
      !user ||
      user.role !== payload.role ||
      user.token_version !== payload.ver
    ) {
      return response.status(401).json({
        message: 'Your session is no longer valid. Please log in again.'
      });
    }

    request.user = {
      id: Number(user.id),
      role: user.role
    };

    next();
  } catch (error) {
    return next(error);
  }
}

// Restrict routes to specific user roles
export function requireRole(...allowedRoles) {
  return (request, response, next) => {
    if (!request.user) {
      return response.status(401).json({
        message: 'Please log in first.'
      });
    }

    if (!allowedRoles.includes(request.user.role)) {
      return response.status(403).json({
        message: 'You are not authorized to access this resource.'
      });
    }

    next();
  };
}

// Admin-only access
export const adminOnly = requireRole('ADMIN');

// Student-only access
export const studentOnly = requireRole('STUDENT');
