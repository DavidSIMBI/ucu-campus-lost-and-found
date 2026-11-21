import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { database } from '../src/config/database.js';
import app from '../src/app.js';

const testSecret = 'auth-roles-test-secret-only';

function tokenFor(id, role, ver = 0) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const content = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: String(id), role, ver, iat: 1, exp: 4102444800 })}`;
  return `${content}.${createHmac('sha256', testSecret).update(content).digest('base64url')}`;
}

async function withServer(run) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    mock.restoreAll();
  }
}

test('public registration always persists STUDENT despite a supplied role', async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = testSecret;
  let insertSql = '';
  mock.method(database, 'execute', async (sql) => {
    if (sql.includes('SELECT setting_value FROM admin_settings')) return [[{ setting_value: true }], []];
    if (sql.includes('INSERT INTO users')) {
      insertSql = sql;
      return [{ insertId: 45 }, []];
    }
    return [[], []];
  });

  try {
    await withServer(async (base) => {
      const response = await fetch(`${base}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: 'New Member', email: 'member@example.invalid', password: 'valid-password', role: 'SUPER_ADMIN' })
      });
      assert.equal(response.status, 201);
      const payload = await response.json();
      const jwtPayload = JSON.parse(Buffer.from(payload.token.split('.')[1], 'base64url').toString());
      assert.equal(jwtPayload.role, 'STUDENT');
      assert.equal(payload.user.role, 'STUDENT');
      assert.match(insertSql, /'STUDENT'/);
      assert.doesNotMatch(insertSql, /request\.body\.role/);
    });
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});

test('Super Admin registration setting blocks new public registrations when disabled', async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = testSecret;
  let inserted = false;
  mock.method(database, 'execute', async (sql) => {
    if (sql.includes('SELECT setting_value FROM admin_settings')) return [[{ setting_value: false }], []];
    if (sql.includes('SELECT id, role, token_version, is_active')) return [[{ id: 1, role: 'STUDENT', token_version: 0, is_active: 1 }], []];
    if (sql.includes('INSERT INTO users')) inserted = true;
    return [[], []];
  });
  try {
    await withServer(async (base) => {
      let response = await fetch(`${base}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: 'New Member', email: 'member@example.invalid', password: 'valid-password' })
      });
      assert.equal(response.status, 503);
      assert.equal(inserted, false);

      response = await fetch(`${base}/api/claims`, {
        method: 'POST', headers: { Authorization: `Bearer ${tokenFor(1, 'STUDENT')}` }
      });
      assert.equal(response.status, 503, 'the claims setting blocks new claims while preserving read access');
    });
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});

test('SUPER_ADMIN can log in through the existing login route and inactive accounts cannot', async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = testSecret;
  const passwordHash = bcrypt.hashSync('valid-password', 4);
  let active = true;
  mock.method(database, 'execute', async (sql) => {
    if (sql.includes('SELECT id, full_name, email, password_hash, role, is_active, token_version')) {
      return [[{
        id: 9, full_name: 'Top Admin', email: 'super@example.invalid', password_hash: passwordHash,
        role: 'SUPER_ADMIN', is_active: active ? 1 : 0, token_version: 3
      }], []];
    }
    return [[], []];
  });

  try {
    await withServer(async (base) => {
      let response = await fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'super@example.invalid', password: 'valid-password' })
      });
      assert.equal(response.status, 200);
      const payload = await response.json();
      assert.equal(payload.user.role, 'SUPER_ADMIN');
      assert.equal(JSON.parse(Buffer.from(payload.token.split('.')[1], 'base64url').toString()).role, 'SUPER_ADMIN');

      active = false;
      response = await fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'super@example.invalid', password: 'valid-password' })
      });
      assert.equal(response.status, 401);
    });
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});

test('an old SUPER_ADMIN token is rejected after the database role changes', async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = testSecret;
  mock.method(database, 'execute', async (sql) => {
    if (sql.includes('SELECT id, role, token_version, is_active')) {
      return [[{ id: 9, role: 'ADMIN', token_version: 4, is_active: 1 }], []];
    }
    return [[], []];
  });

  try {
    await withServer(async (base) => {
      const response = await fetch(`${base}/api/super-admin/admins`, {
        headers: { Authorization: `Bearer ${tokenFor(9, 'SUPER_ADMIN', 3)}` }
      });
      assert.equal(response.status, 401);
    });
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});
