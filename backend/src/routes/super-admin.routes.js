import { Router } from 'express';
import { authenticate, superAdminOnly } from '../middleware/auth.middleware.js';
import {
  createAdminAccount,
  getSettings,
  listAdminAccounts,
  listAdminAudit,
  setAdminAccountRole,
  setAdminAccountStatus,
  updateSetting
} from '../services/admin-management.service.js';
import { parsePositiveId } from '../services/claim-validation.js';

const router = Router();
router.use(authenticate, superAdminOnly);

router.get('/admins', async (request, response, next) => {
  const search = typeof request.query.search === 'string' ? request.query.search.trim() : '';
  if (search.length > 120) return response.status(400).json({ message: 'Search must be 120 characters or fewer.' });
  try {
    return response.json({ admins: await listAdminAccounts(search) });
  } catch (error) {
    return next(error);
  }
});

router.post('/admins', async (request, response, next) => {
  const body = request.body;
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).some((key) => !['fullName', 'email', 'password'].includes(key))) {
    return response.status(400).json({ message: 'Submit only fullName, email, and password to create an ADMIN.' });
  }
  try {
    const admin = await createAdminAccount(request.user, body);
    return response.status(201).json({ admin });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return response.status(409).json({ message: 'An account with that email already exists.' });
    return next(error);
  }
});

router.patch('/admins/:id/status', async (request, response, next) => {
  const targetId = parsePositiveId(request.params.id);
  if (!targetId) return response.status(400).json({ message: 'Invalid administrator ID.' });
  const { isActive } = request.body ?? {};
  try {
    return response.json({ admin: await setAdminAccountStatus(request.user, targetId, isActive) });
  } catch (error) {
    if (error.status) return response.status(error.status).json({ message: error.message });
    return next(error);
  }
});

router.patch('/admins/:id/role', async (request, response, next) => {
  const targetId = parsePositiveId(request.params.id);
  if (!targetId) return response.status(400).json({ message: 'Invalid administrator ID.' });
  try {
    return response.json({ admin: await setAdminAccountRole(request.user, targetId, request.body?.role) });
  } catch (error) {
    if (error.status) return response.status(error.status).json({ message: error.message });
    return next(error);
  }
});

router.get('/audit', async (request, response, next) => {
  const page = Number(request.query.page ?? 1);
  const limit = Number(request.query.limit ?? 25);
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    return response.status(400).json({ message: 'Page must be positive and limit must be between 1 and 100.' });
  }
  try {
    return response.json(await listAdminAudit({ page, limit }));
  } catch (error) {
    return next(error);
  }
});

router.get('/settings', async (_request, response, next) => {
  try {
    return response.json({ settings: await getSettings() });
  } catch (error) {
    return next(error);
  }
});

router.patch('/settings/:key', async (request, response, next) => {
  try {
    return response.json({ setting: await updateSetting(request.user, request.params.key, request.body?.value) });
  } catch (error) {
    if (error.status) return response.status(error.status).json({ message: error.message });
    return next(error);
  }
});

export default router;
