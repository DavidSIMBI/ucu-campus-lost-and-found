import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { database } from '../src/config/database.js';
import app from '../src/app.js';
import { bootstrapFirstSuperAdmin, setAdminAccountRole, setAdminAccountStatus } from '../src/services/admin-management.service.js';

const testSecret = 'super-admin-api-test-secret-only';

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

function auth(role, id, ver = 0) {
  return { Authorization: `Bearer ${tokenFor(id, role, ver)}` };
}

test('Super Admin endpoints enforce roles, create ADMINs, audit changes, and revoke stale tokens', async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = testSecret;
  const users = new Map([
    [1, { id: 1, full_name: 'Root One', email: 'root1@example.invalid', role: 'SUPER_ADMIN', is_active: 1, token_version: 0 }],
    [2, { id: 2, full_name: 'Eligible Admin', email: 'admin@example.invalid', role: 'ADMIN', is_active: 1, token_version: 0 }],
    [3, { id: 3, full_name: 'Inactive Admin', email: 'inactive@example.invalid', role: 'ADMIN', is_active: 0, token_version: 0 }],
    [4, { id: 4, full_name: 'Root Two', email: 'root2@example.invalid', role: 'SUPER_ADMIN', is_active: 1, token_version: 0 }],
    [5, { id: 5, full_name: 'Student', email: 'student@example.invalid', role: 'STUDENT', is_active: 1, token_version: 0 }]
  ]);
  const auditRows = [];
  let nextId = 6;

  mock.method(database, 'execute', async (sql, values = []) => {
    if (sql.includes('SELECT id, role, token_version, is_active')) {
      const user = users.get(Number(values[0]));
      return [user ? [{ ...user }] : [], []];
    }
    if (sql.includes('SELECT id, full_name, email, role, is_active, created_at')) {
      const accounts = [...users.values()].filter((user) => ['ADMIN', 'SUPER_ADMIN'].includes(user.role));
      return [accounts.map((user) => ({ ...user, created_at: new Date('2026-01-01T00:00:00Z') })), []];
    }
    if (sql.includes('SELECT COUNT(*) AS total FROM admin_audit_log')) return [[{ total: auditRows.length }], []];
    if (sql.includes('FROM admin_audit_log log')) {
      return [auditRows.map((entry) => ({ ...entry, actor_name: 'Root One', target_name: entry.target_user_id ? users.get(entry.target_user_id)?.full_name : null, created_at: new Date() })), []];
    }
    if (sql.includes('SELECT setting_key, setting_value, updated_at FROM admin_settings')) return [[], []];
    return [[], []];
  });

  mock.method(database, 'getConnection', async () => ({
    async beginTransaction() {}, async commit() {}, async rollback() {}, release() {},
    async execute(sql, values = []) {
      if (sql.includes('SELECT id FROM admin_governance_lock')) return [[{ id: 1 }], []];
      if (sql.includes('SELECT id, role, is_active, token_version FROM users WHERE id = ?')) {
        const user = users.get(Number(values[0]));
        return [user ? [{ ...user }] : [], []];
      }
      if (sql.includes('SELECT id, full_name, email, role, is_active, token_version')) {
        const user = users.get(Number(values[0]));
        return [user ? [{ ...user }] : [], []];
      }
      if (sql.includes("SELECT id FROM users WHERE role = 'SUPER_ADMIN' AND is_active = TRUE")) {
        return [[...users.values()].filter((user) => user.role === 'SUPER_ADMIN' && user.is_active), []];
      }
      if (sql.includes("INSERT INTO users (full_name, email, password_hash, role, is_active, token_version)")) {
        const [fullName, email, passwordHash] = values;
        const user = { id: nextId++, full_name: fullName, email, password_hash: passwordHash, role: 'ADMIN', is_active: 1, token_version: 0 };
        users.set(user.id, user);
        return [{ insertId: user.id }, []];
      }
      if (sql.includes('UPDATE users SET is_active = ?')) {
        const user = users.get(Number(values[1]));
        user.is_active = values[0] ? 1 : 0;
        user.token_version += 1;
        return [{ affectedRows: 1 }, []];
      }
      if (sql.includes('UPDATE users SET role = ?')) {
        const user = users.get(Number(values[1]));
        user.role = values[0];
        user.token_version += 1;
        return [{ affectedRows: 1 }, []];
      }
      if (sql.includes('INSERT INTO admin_audit_log')) {
        auditRows.push({ actor_user_id: values[0], actor_role: values[1], target_user_id: values[2], action: values[3], metadata: JSON.parse(values[4]) });
        return [{ insertId: auditRows.length }, []];
      }
      if (sql.includes('INSERT INTO admin_settings')) return [{ affectedRows: 1 }, []];
      return [[], []];
    }
  }));

  try {
    await withServer(async (base) => {
      let response = await fetch(`${base}/api/super-admin/admins`);
      assert.equal(response.status, 401);

      response = await fetch(`${base}/api/super-admin/admins`, { headers: auth('STUDENT', 5) });
      assert.equal(response.status, 403);

      response = await fetch(`${base}/api/super-admin/admins`, { headers: auth('ADMIN', 2) });
      assert.equal(response.status, 403);

      response = await fetch(`${base}/api/super-admin/admins`, { headers: auth('SUPER_ADMIN', 1) });
      assert.equal(response.status, 200);

      response = await fetch(`${base}/api/super-admin/admins`, {
        method: 'POST', headers: { ...auth('ADMIN', 2), 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: 'Injected Role', email: 'inject@example.invalid', password: 'valid-password', role: 'SUPER_ADMIN' })
      });
      assert.equal(response.status, 403, 'ADMIN cannot reach administrator management endpoints');
      response = await fetch(`${base}/api/super-admin/admins/2/role`, {
        method: 'PATCH', headers: { ...auth('ADMIN', 2), 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'SUPER_ADMIN' })
      });
      assert.equal(response.status, 403, 'ADMIN cannot promote an account to SUPER_ADMIN');

      response = await fetch(`${base}/api/super-admin/admins`, {
        method: 'POST', headers: { ...auth('SUPER_ADMIN', 1), 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: 'Injected Role', email: 'inject@example.invalid', password: 'valid-password', role: 'SUPER_ADMIN' })
      });
      assert.equal(response.status, 400, 'the create endpoint does not accept a role field');

      response = await fetch(`${base}/api/super-admin/admins`, {
        method: 'POST', headers: { ...auth('SUPER_ADMIN', 1), 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: 'New Admin', email: 'new-admin@example.invalid', password: 'valid-password' })
      });
      assert.equal(response.status, 201);
      const created = (await response.json()).admin;
      assert.equal(created.role, 'ADMIN');
      assert.equal(await bcrypt.compare('valid-password', users.get(created.id).password_hash), true);
      assert.equal(auditRows.at(-1).action, 'admin.created');
      assert.equal(JSON.stringify(auditRows).includes('valid-password'), false);

      response = await fetch(`${base}/api/super-admin/audit`, { headers: auth('ADMIN', 2) });
      assert.equal(response.status, 403, 'ADMIN cannot view Super Admin audit logs');
      response = await fetch(`${base}/api/super-admin/audit`, { headers: auth('SUPER_ADMIN', 1) });
      assert.equal(response.status, 200);
      assert.equal((await response.json()).entries[0].action, 'admin.created');

      response = await fetch(`${base}/api/super-admin/admins/2/status`, {
        method: 'PATCH', headers: { ...auth('SUPER_ADMIN', 1), 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false })
      });
      assert.equal(response.status, 200);
      assert.equal(users.get(2).is_active, 0, 'SUPER_ADMIN can deactivate an ADMIN account');
      response = await fetch(`${base}/api/super-admin/admins/2/status`, {
        method: 'PATCH', headers: { ...auth('SUPER_ADMIN', 1), 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true })
      });
      assert.equal(response.status, 200);

      response = await fetch(`${base}/api/super-admin/admins/2/role`, {
        method: 'PATCH', headers: { ...auth('SUPER_ADMIN', 1), 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'SUPER_ADMIN' })
      });
      assert.equal(response.status, 200);
      assert.equal(users.get(2).token_version, 3);
      response = await fetch(`${base}/api/super-admin/admins`, { headers: auth('ADMIN', 2) });
      assert.equal(response.status, 401, 'an old role token is rejected after promotion');

      response = await fetch(`${base}/api/super-admin/admins/3/role`, {
        method: 'PATCH', headers: { ...auth('SUPER_ADMIN', 1), 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'SUPER_ADMIN' })
      });
      assert.equal(response.status, 409, 'inactive ADMIN accounts are not eligible for promotion');

      response = await fetch(`${base}/api/super-admin/admins/1/status`, {
        method: 'PATCH', headers: { ...auth('SUPER_ADMIN', 1), 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false })
      });
      assert.equal(response.status, 403, 'Super Admins cannot change their own privileges');

      response = await fetch(`${base}/api/super-admin/admins/3/status`, {
        method: 'PATCH', headers: { ...auth('SUPER_ADMIN', 1), 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true })
      });
      assert.equal(response.status, 200);
      assert.equal(users.get(3).token_version, 1);
      response = await fetch(`${base}/api/super-admin/admins`, { headers: auth('ADMIN', 3) });
      assert.equal(response.status, 401, 'an old status token is invalidated after activation');

      response = await fetch(`${base}/api/super-admin/settings`, { headers: auth('SUPER_ADMIN', 1) });
      assert.equal(response.status, 200);
      response = await fetch(`${base}/api/super-admin/settings/student_registration_enabled`, {
        method: 'PATCH', headers: { ...auth('SUPER_ADMIN', 1), 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: false })
      });
      assert.equal(response.status, 200);
      assert.equal(auditRows.at(-1).action, 'setting.updated');
    });
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});

test('bootstrap creates exactly one SUPER_ADMIN and preserves existing ADMIN accounts', async () => {
  const users = [{ id: 2, role: 'ADMIN', email: 'legacy-admin@example.invalid' }];
  const audit = [];
  mock.method(database, 'getConnection', async () => ({
    async beginTransaction() {}, async commit() {}, async rollback() {}, release() {},
    async execute(sql, values = []) {
      if (sql.includes('SELECT id FROM admin_governance_lock')) return [[{ id: 1 }], []];
      if (sql.includes("SELECT id FROM users WHERE role = 'SUPER_ADMIN' LIMIT 1 FOR UPDATE")) {
        return [users.filter((user) => user.role === 'SUPER_ADMIN'), []];
      }
      if (sql.includes("INSERT INTO users (full_name, email, password_hash, role, is_active, token_version)")) {
        const [full_name, email, password_hash] = values;
        users.push({ id: 3, full_name, email, password_hash, role: 'SUPER_ADMIN', is_active: 1, token_version: 0 });
        return [{ insertId: 3 }, []];
      }
      if (sql.includes('INSERT INTO admin_audit_log')) {
        audit.push(values);
        return [{ insertId: audit.length }, []];
      }
      return [[], []];
    }
  }));

  const created = await bootstrapFirstSuperAdmin({
    fullName: 'First Super', email: 'first-super@example.invalid', password: 'secure-password'
  });
  assert.equal(created.role, 'SUPER_ADMIN');
  assert.equal(await bcrypt.compare('secure-password', users.at(-1).password_hash), true);
  assert.equal(users[0].role, 'ADMIN', 'the existing ADMIN account is preserved');
  assert.equal(audit[0][0], null, 'bootstrap is attributed to the trusted operator, not a fabricated user');
  assert.equal(audit[0][1], 'BOOTSTRAP');
  assert.equal(JSON.stringify(audit).includes('secure-password'), false);

  await assert.rejects(
    bootstrapFirstSuperAdmin({ fullName: 'Second Super', email: 'second@example.invalid', password: 'another-password' }),
    { status: 409 }
  );
  assert.equal(users.filter((user) => user.role === 'SUPER_ADMIN').length, 1);
  mock.restoreAll();
});

test('serialized concurrent Super Admin changes cannot remove the last active Super Admin', async () => {
  const users = new Map([
    [11, { id: 11, role: 'SUPER_ADMIN', is_active: 1, token_version: 0 }],
    [12, { id: 12, role: 'SUPER_ADMIN', is_active: 1, token_version: 0 }]
  ]);
  let previousLock = Promise.resolve();
  mock.method(database, 'getConnection', async () => {
    let releaseLock = null;
    let acquired = false;
    return {
      async beginTransaction() {}, async commit() {}, async rollback() {},
      release() { if (acquired) releaseLock(); },
      async execute(sql, values = []) {
        if (sql.includes('SELECT id FROM admin_governance_lock')) {
          const previous = previousLock;
          let release;
          previousLock = new Promise((resolve) => { release = resolve; });
          await previous;
          acquired = true;
          releaseLock = release;
          return [[{ id: 1 }], []];
        }
        if (sql.includes('SELECT id, role, is_active, token_version FROM users WHERE id = ?')) {
          const user = users.get(Number(values[0]));
          return [user ? [{ ...user }] : [], []];
        }
        if (sql.includes('SELECT id, full_name, email, role, is_active, token_version')) {
          const user = users.get(Number(values[0]));
          return [user ? [{ ...user }] : [], []];
        }
        if (sql.includes("SELECT id FROM users WHERE role = 'SUPER_ADMIN' AND is_active = TRUE")) {
          return [[...users.values()].filter((user) => user.role === 'SUPER_ADMIN' && user.is_active), []];
        }
        if (sql.includes('UPDATE users SET is_active = ?')) {
          const user = users.get(Number(values[1]));
          user.is_active = values[0] ? 1 : 0;
          user.token_version += 1;
          return [{ affectedRows: 1 }, []];
        }
        if (sql.includes('UPDATE users SET role = ?')) {
          const user = users.get(Number(values[1]));
          user.role = values[0];
          user.token_version += 1;
          return [{ affectedRows: 1 }, []];
        }
        return [[], []];
      }
    };
  });

  const attempts = await Promise.allSettled([
    setAdminAccountStatus({ id: 11, role: 'SUPER_ADMIN', tokenVersion: 0 }, 12, false),
    setAdminAccountRole({ id: 12, role: 'SUPER_ADMIN', tokenVersion: 0 }, 11, 'ADMIN')
  ]);
  assert.equal(attempts.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(attempts.filter((result) => result.status === 'rejected').length, 1);
  assert.equal([...users.values()].filter((user) => user.role === 'SUPER_ADMIN' && user.is_active).length, 1);
  mock.restoreAll();
});
