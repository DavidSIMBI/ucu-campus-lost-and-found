import bcrypt from 'bcryptjs';
import { database } from '../config/database.js';
import { listAdminSettings, saveAdminSetting } from './admin-settings.service.js';

const emailPattern = /^\S+@\S+\.\S+$/;

function serviceError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export async function writeAdminAudit(connection, actor, targetId, action, metadata = {}) {
  await connection.execute(
    `INSERT INTO admin_audit_log
       (actor_user_id, actor_role, target_user_id, action, metadata)
     VALUES (?, ?, ?, ?, ?)`,
    [actor?.id ?? null, actor?.role ?? 'BOOTSTRAP', targetId ?? null, action, JSON.stringify(metadata)]
  );
}

async function withGovernanceTransaction(work, actor = null) {
  const connection = await database.getConnection();
  try {
    await connection.beginTransaction();
    const [lockRows] = await connection.execute(
      'SELECT id FROM admin_governance_lock WHERE id = 1 FOR UPDATE'
    );
    if (!lockRows.length) throw new Error('The admin governance lock row is missing. Apply the Super Admin migration.');
    if (actor) {
      const [actorRows] = await connection.execute(
        'SELECT id, role, is_active, token_version FROM users WHERE id = ? FOR UPDATE',
        [actor.id]
      );
      const currentActor = actorRows[0];
      if (!currentActor || currentActor.role !== 'SUPER_ADMIN' || !Boolean(currentActor.is_active) ||
          Number(currentActor.token_version) !== Number(actor.tokenVersion)) {
        throw serviceError(401, 'Your Super Admin session is no longer valid. Please log in again.');
      }
    }

    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listAdminAccounts(search = '') {
  const values = [];
  let where = "WHERE role IN ('ADMIN', 'SUPER_ADMIN')";
  if (search) {
    where += ' AND (full_name LIKE ? OR email LIKE ?)';
    values.push(`%${search}%`, `%${search}%`);
  }
  const [rows] = await database.execute(
    `SELECT id, full_name, email, role, is_active, created_at
     FROM users ${where}
     ORDER BY CASE role WHEN 'SUPER_ADMIN' THEN 0 ELSE 1 END, full_name, id`,
    values
  );
  return rows.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at
  }));
}

export async function createAdminAccount(actor, { fullName, email, password }) {
  const normalizedName = typeof fullName === 'string' ? fullName.trim() : '';
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (normalizedName.length < 2 || normalizedName.length > 120) {
    throw serviceError(400, 'Name must be between 2 and 120 characters.');
  }
  if (!emailPattern.test(normalizedEmail) || normalizedEmail.length > 254) {
    throw serviceError(400, 'Enter a valid email address.');
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    throw serviceError(400, 'Password must be between 8 and 128 characters.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  return withGovernanceTransaction(async (connection) => {
    const [result] = await connection.execute(
      `INSERT INTO users (full_name, email, password_hash, role, is_active, token_version)
       VALUES (?, ?, ?, 'ADMIN', TRUE, 0)`,
      [normalizedName, normalizedEmail, passwordHash]
    );
    await writeAdminAudit(connection, actor, result.insertId, 'admin.created', { role: 'ADMIN' });
    return {
      id: result.insertId,
      fullName: normalizedName,
      email: normalizedEmail,
      role: 'ADMIN',
      isActive: true
    };
  }, actor);
}

export async function bootstrapFirstSuperAdmin({ fullName, email, password }) {
  const normalizedName = typeof fullName === 'string' ? fullName.trim() : '';
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (normalizedName.length < 2 || normalizedName.length > 120) {
    throw serviceError(400, 'Name must be between 2 and 120 characters.');
  }
  if (!emailPattern.test(normalizedEmail) || normalizedEmail.length > 254) {
    throw serviceError(400, 'Enter a valid email address.');
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    throw serviceError(400, 'Password must be between 8 and 128 characters.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  return withGovernanceTransaction(async (connection) => {
    const [existing] = await connection.execute(
      "SELECT id FROM users WHERE role = 'SUPER_ADMIN' LIMIT 1 FOR UPDATE"
    );
    if (existing.length) throw serviceError(409, 'A Super Admin already exists; bootstrap can only run once.');

    const [result] = await connection.execute(
      `INSERT INTO users (full_name, email, password_hash, role, is_active, token_version)
       VALUES (?, ?, ?, 'SUPER_ADMIN', TRUE, 0)`,
      [normalizedName, normalizedEmail, passwordHash]
    );
    await writeAdminAudit(connection, null, result.insertId, 'super_admin.bootstrapped', { role: 'SUPER_ADMIN' });
    return { id: result.insertId, fullName: normalizedName, email: normalizedEmail, role: 'SUPER_ADMIN', isActive: true };
  });
}

async function getTargetForUpdate(connection, targetId) {
  const [rows] = await connection.execute(
    `SELECT id, full_name, email, role, is_active, token_version
     FROM users WHERE id = ? FOR UPDATE`,
    [targetId]
  );
  if (!rows.length) throw serviceError(404, 'Administrator not found.');
  return rows[0];
}

async function getActiveSuperAdminsForUpdate(connection) {
  const [rows] = await connection.execute(
    "SELECT id FROM users WHERE role = 'SUPER_ADMIN' AND is_active = TRUE FOR UPDATE"
  );
  return rows;
}

export async function setAdminAccountStatus(actor, targetId, isActive) {
  if (typeof isActive !== 'boolean') throw serviceError(400, 'isActive must be a boolean.');
  return withGovernanceTransaction(async (connection) => {
    const target = await getTargetForUpdate(connection, targetId);
    if (Number(target.id) === Number(actor.id)) {
      throw serviceError(403, 'You cannot change your own account status.');
    }
    if (!['ADMIN', 'SUPER_ADMIN'].includes(target.role)) {
      throw serviceError(404, 'Administrator not found.');
    }
    const currentlyActive = Boolean(target.is_active);
    if (currentlyActive === isActive) {
      return { id: target.id, role: target.role, isActive, unchanged: true };
    }
    if (target.role === 'SUPER_ADMIN' && currentlyActive && !isActive) {
      const activeSuperAdmins = await getActiveSuperAdminsForUpdate(connection);
      if (activeSuperAdmins.length <= 1) {
        throw serviceError(409, 'The last active Super Admin cannot be deactivated.');
      }
    }

    await connection.execute(
      'UPDATE users SET is_active = ?, token_version = token_version + 1 WHERE id = ?',
      [isActive, targetId]
    );
    const scope = target.role === 'SUPER_ADMIN' ? 'super_admin' : 'admin';
    await writeAdminAudit(connection, actor, targetId, `${scope}.${isActive ? 'activated' : 'deactivated'}`, {
      role: target.role,
      isActive
    });
    return { id: target.id, role: target.role, isActive };
  }, actor);
}

export async function setAdminAccountRole(actor, targetId, role) {
  if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) {
    throw serviceError(400, 'Role must be ADMIN or SUPER_ADMIN.');
  }
  return withGovernanceTransaction(async (connection) => {
    const target = await getTargetForUpdate(connection, targetId);
    if (Number(target.id) === Number(actor.id)) {
      throw serviceError(403, 'You cannot change your own role or privileges.');
    }
    if (!['ADMIN', 'SUPER_ADMIN'].includes(target.role)) {
      throw serviceError(404, 'Administrator not found.');
    }
    if (target.role === role) {
      return { id: target.id, role, isActive: Boolean(target.is_active), unchanged: true };
    }
    if (target.role === 'ADMIN' && role === 'SUPER_ADMIN' && !Boolean(target.is_active)) {
      throw serviceError(409, 'Only an active ADMIN can be promoted to SUPER_ADMIN.');
    }
    if (target.role === 'SUPER_ADMIN' && role === 'ADMIN' && Boolean(target.is_active)) {
      const activeSuperAdmins = await getActiveSuperAdminsForUpdate(connection);
      if (activeSuperAdmins.length <= 1) {
        throw serviceError(409, 'The last active Super Admin cannot be demoted.');
      }
    }

    await connection.execute(
      'UPDATE users SET role = ?, token_version = token_version + 1 WHERE id = ?',
      [role, targetId]
    );
    await writeAdminAudit(connection, actor, targetId, role === 'SUPER_ADMIN' ? 'admin.promoted' : 'admin.demoted', {
      fromRole: target.role,
      toRole: role
    });
    return { id: target.id, role, isActive: Boolean(target.is_active) };
  }, actor);
}

export async function listAdminAudit({ page = 1, limit = 25 }) {
  const offset = (page - 1) * limit;
  const [countResult, auditResult] = await Promise.all([
    database.execute('SELECT COUNT(*) AS total FROM admin_audit_log'),
    database.execute(
      `SELECT log.id, log.actor_user_id, log.actor_role, actor.full_name AS actor_name,
              log.target_user_id, target.full_name AS target_name, log.action,
              log.metadata, log.created_at
       FROM admin_audit_log log
       LEFT JOIN users actor ON actor.id = log.actor_user_id
       LEFT JOIN users target ON target.id = log.target_user_id
       ORDER BY log.created_at DESC, log.id DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    )
  ]);
  const countRow = countResult[0][0];
  const rows = auditResult[0];
  return {
    entries: rows.map((row) => ({
      id: row.id,
      actor: row.actor_user_id ? { id: row.actor_user_id, name: row.actor_name, role: row.actor_role } : { name: 'Bootstrap operator', role: row.actor_role },
      target: row.target_user_id ? { id: row.target_user_id, name: row.target_name } : null,
      action: row.action,
      metadata: row.metadata,
      createdAt: row.created_at
    })),
    pagination: { page, limit, total: Number(countRow.total), totalPages: Math.ceil(Number(countRow.total) / limit) }
  };
}

export async function getSettings() {
  return listAdminSettings();
}

export async function updateSetting(actor, key, value) {
  return withGovernanceTransaction(async (connection) => {
    const definition = await saveAdminSetting(connection, key, value, actor.id);
    await writeAdminAudit(connection, actor, null, 'setting.updated', { key, value });
    return { key, label: definition.label, description: definition.description, value };
  }, actor);
}
