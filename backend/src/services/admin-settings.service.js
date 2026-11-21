import { database } from '../config/database.js';

export const ADMIN_SETTING_DEFINITIONS = Object.freeze({
  student_registration_enabled: {
    label: 'Student registration',
    description: 'Allow new students to create accounts.',
    defaultValue: true
  },
  claim_submissions_enabled: {
    label: 'Claim submissions',
    description: 'Allow students to submit new claims for found items.',
    defaultValue: true
  }
});

function decodeSetting(value) {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return value; }
}

export async function getAdminSetting(key, executor = database) {
  const definition = ADMIN_SETTING_DEFINITIONS[key];
  if (!definition) throw new Error('Unknown administrative setting.');

  try {
    const [rows] = await executor.execute(
      'SELECT setting_value FROM admin_settings WHERE setting_key = ? LIMIT 1',
      [key]
    );
    return rows.length ? decodeSetting(rows[0].setting_value) : definition.defaultValue;
  } catch (error) {
    // Old installations remain usable until the forward-only settings migration is applied.
    if (error.code === 'ER_NO_SUCH_TABLE') return definition.defaultValue;
    throw error;
  }
}

export async function listAdminSettings(executor = database) {
  const [rows] = await executor.execute('SELECT setting_key, setting_value, updated_at FROM admin_settings');
  const stored = new Map(rows.map((row) => [row.setting_key, row]));
  return Object.entries(ADMIN_SETTING_DEFINITIONS).map(([key, definition]) => ({
    key,
    label: definition.label,
    description: definition.description,
    value: stored.has(key) ? decodeSetting(stored.get(key).setting_value) : definition.defaultValue,
    updatedAt: stored.get(key)?.updated_at ?? null
  }));
}

export async function saveAdminSetting(connection, key, value, actorId) {
  if (!Object.hasOwn(ADMIN_SETTING_DEFINITIONS, key)) {
    const error = new Error('Unknown administrative setting.');
    error.status = 404;
    throw error;
  }
  if (typeof value !== 'boolean') {
    const error = new Error('Administrative settings must be boolean values.');
    error.status = 400;
    throw error;
  }

  await connection.execute(
    `INSERT INTO admin_settings (setting_key, setting_value, updated_by)
     VALUES (?, CAST(? AS JSON), ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)`,
    [key, JSON.stringify(value), actorId]
  );
  return ADMIN_SETTING_DEFINITIONS[key];
}

export function requireEnabledSetting(key, unavailableMessage) {
  return async (_request, response, next) => {
    try {
      if (!(await getAdminSetting(key))) {
        return response.status(503).json({ message: unavailableMessage });
      }
      return next();
    } catch (error) {
      return next(error);
    }
  };
}
