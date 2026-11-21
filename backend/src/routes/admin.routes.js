
import { Router } from 'express';
import { database } from '../config/database.js';
import {
  authenticate,
  adminOnly
} from '../middleware/auth.middleware.js';
import {
  canCompleteClaim,
  canReviewClaim,
  getReviewStatus,
  isApprovedClaimConflict,
  parsePositiveId,
  validateReviewNote
} from '../services/claim-validation.js';
import { writeAdminAudit } from '../services/admin-management.service.js';

const router = Router();
const claimStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN'];

// Protect all admin routes
router.use(authenticate, adminOnly);

// GET ADMIN DASHBOARD STATISTICS
router.get('/dashboard', async (request, response, next) => {
  try {
    const [users] = await database.execute(
      'SELECT COUNT(*) AS total FROM users'
    );

    const [students] = await database.execute(
      "SELECT COUNT(*) AS total FROM users WHERE role = 'STUDENT'"
    );
    const [superAdmins] = await database.execute(
      "SELECT COUNT(*) AS total FROM users WHERE role = 'SUPER_ADMIN'"
    );

    const [reports] = await database.execute(
      'SELECT COUNT(*) AS total FROM reports'
    );

    const [claims] = await database.execute(
      `SELECT COUNT(*) AS total,
              SUM(status = 'PENDING') AS pending,
              SUM(status = 'APPROVED') AS approved,
              SUM(status = 'REJECTED') AS rejected
       FROM claims`
    );

    const [lost] = await database.execute(
      "SELECT COUNT(*) AS total FROM reports WHERE report_type = 'LOST'"
    );

    const [found] = await database.execute(
      "SELECT COUNT(*) AS total FROM reports WHERE report_type = 'FOUND'"
    );
    const [returned] = await database.execute(
      "SELECT COUNT(*) AS total FROM reports WHERE status = 'RETURNED'"
    );
    const [recentClaims] = await database.execute(
      `SELECT c.id, c.status, c.created_at, claimant.full_name AS claimant_name,
              r.id AS report_id, r.title AS report_title
       FROM claims c
       JOIN users claimant ON claimant.id = c.claimant_id
       JOIN reports r ON r.id = c.report_id
       ORDER BY c.created_at DESC, c.id DESC LIMIT 5`
    );
    const [recentReports] = await database.execute(
      `SELECT r.id, r.title, r.report_type, r.status, r.created_at,
              reporter.full_name AS reporter_name
       FROM reports r JOIN users reporter ON reporter.id = r.reporter_id
       ORDER BY r.created_at DESC, r.id DESC LIMIT 5`
    );

    return response.json({
      message: 'Admin dashboard statistics retrieved successfully.',
      statistics: {
        totalUsers: users[0].total,
        totalStudents: students[0].total,
        totalAdmins: Number(users[0].total) - Number(students[0].total) - Number(superAdmins[0].total),
        totalSuperAdmins: Number(superAdmins[0].total),
        totalReports: reports[0].total,
        totalClaims: claims[0].total,
        pendingClaims: claims[0].pending ?? 0,
        approvedClaims: claims[0].approved ?? 0,
        rejectedClaims: claims[0].rejected ?? 0,
        lostItems: lost[0].total,
        foundItems: found[0].total,
        returnedItems: returned[0].total
      },
      recentClaims: recentClaims.map((claim) => ({
        id: claim.id,
        status: claim.status,
        submittedAt: claim.created_at,
        claimantName: claim.claimant_name,
        report: { id: claim.report_id, title: claim.report_title }
      })),
      recentReports: recentReports.map((report) => ({
        id: report.id,
        title: report.title,
        reportType: report.report_type,
        status: report.status,
        createdAt: report.created_at,
        reporterName: report.reporter_name
      }))
    });

  } catch (error) {
    next(error);
  }
});

// READ-ONLY PAGINATED USER DIRECTORY
router.get('/users', async (request, response, next) => {
  const role = request.query.role ? String(request.query.role).toUpperCase() : '';
  if (role && !['STUDENT', 'ADMIN'].includes(role)) {
    return response.status(400).json({ message: 'Role must be STUDENT or ADMIN.' });
  }

  const page = Number(request.query.page ?? 1);
  const limit = Number(request.query.limit ?? 25);
  const offset = (page - 1) * limit;
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100 || !Number.isSafeInteger(offset)) {
    return response.status(400).json({ message: 'Page must be positive and limit must be between 1 and 100.' });
  }

  const search = typeof request.query.search === 'string' ? request.query.search.trim() : '';
  if (search.length > 120) {
    return response.status(400).json({ message: 'Search must be 120 characters or fewer.' });
  }
  const filters = ["role <> 'SUPER_ADMIN'"];
  const values = [];
  if (role) {
    filters.push('role = ?');
    values.push(role);
  }
  if (search) {
    filters.push('(full_name LIKE ? OR email LIKE ?)');
    values.push(`%${search}%`, `%${search}%`);
  }
  const where = filters.length ? ` WHERE ${filters.join(' AND ')}` : '';

  try {
    const [counts] = await database.execute(
      `SELECT COUNT(*) AS total FROM users${where}`,
      values
    );
    const [users] = await database.execute(
      `SELECT id, full_name, email, role, is_active, created_at
       FROM users${where}
       ORDER BY created_at DESC, id DESC
       LIMIT ? OFFSET ?`,
      [...values, limit, offset]
    );

    const total = Number(counts[0].total);
    return response.json({
      users: users.map((user) => ({
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        isActive: Boolean(user.is_active),
        registeredAt: user.created_at
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    return next(error);
  }
});

const claimSelect = `
  SELECT c.id, c.report_id, c.claimant_id, c.status, NULL AS justification,
         c.reviewed_by, c.reviewed_at, NULL AS review_note, c.created_at,
         claimant.full_name AS claimant_name, claimant.email AS claimant_email,
         reviewer.full_name AS reviewer_name,
         r.title AS report_title, r.category AS report_category,
         r.location AS report_location,
         DATE_FORMAT(r.event_date, '%Y-%m-%d') AS report_event_date,
         r.status AS report_status, r.report_type, r.reporter_id
  FROM claims c
  JOIN users claimant ON claimant.id = c.claimant_id
  LEFT JOIN users reviewer ON reviewer.id = c.reviewed_by
  JOIN reports r ON r.id = c.report_id
`;

function adminClaimResponse(row) {
  return {
    id: row.id,
    status: row.status,
    justification: row.justification,
    submittedAt: row.created_at,
    reviewedAt: row.reviewed_at,
    reviewNote: row.review_note,
    reviewer: row.reviewer_name ? { fullName: row.reviewer_name } : null,
    claimant: {
      id: row.claimant_id,
      fullName: row.claimant_name,
      email: row.claimant_email
    },
    report: {
      id: row.report_id,
      title: row.report_title,
      category: row.report_category,
      location: row.report_location,
      eventDate: row.report_event_date,
      status: row.report_status,
      reportType: row.report_type,
      reporterId: row.reporter_id
    }
  };
}

// GET PAGINATED CLAIM REVIEW QUEUE
router.get('/claims', async (request, response, next) => {
  const status = request.query.status ? String(request.query.status).toUpperCase() : '';
  if (status && !claimStatuses.includes(status)) {
    return response.status(400).json({ message: 'Invalid claim status filter.' });
  }

  const page = Number(request.query.page ?? 1);
  const limit = Number(request.query.limit ?? 20);
  const offset = (page - 1) * limit;
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100 || !Number.isSafeInteger(offset)) {
    return response.status(400).json({ message: 'Page must be positive and limit must be between 1 and 100.' });
  }

  const search = typeof request.query.search === 'string' ? request.query.search.trim() : '';
  if (search.length > 120) {
    return response.status(400).json({ message: 'Search must be 120 characters or fewer.' });
  }
  const sort = String(request.query.sort ?? 'pending').toLowerCase();
  const sortSqlByKey = {
    pending: "CASE c.status WHEN 'PENDING' THEN 0 ELSE 1 END, c.created_at ASC, c.id ASC",
    newest: 'c.created_at DESC, c.id DESC',
    oldest: 'c.created_at ASC, c.id ASC'
  };
  if (!Object.hasOwn(sortSqlByKey, sort)) {
    return response.status(400).json({ message: 'Sort must be pending, newest, or oldest.' });
  }

  const where = [];
  const values = [];
  if (status) {
    where.push('c.status = ?');
    values.push(status);
  }
  if (search) {
    where.push('(claimant.full_name LIKE ? OR claimant.email LIKE ? OR r.title LIKE ?)');
    const term = `%${search}%`;
    values.push(term, term, term);
  }
  const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : '';

  try {
    const [countRows] = await database.execute(
      `SELECT COUNT(*) AS total
       FROM claims c
       JOIN users claimant ON claimant.id = c.claimant_id
       JOIN reports r ON r.id = c.report_id${whereSql}`,
      values
    );
    const [rows] = await database.execute(
      `${claimSelect}${whereSql}
       ORDER BY ${sortSqlByKey[sort]}
       LIMIT ? OFFSET ?`,
      [...values, limit, offset]
    );

    return response.json({
      claims: rows.map(adminClaimResponse),
      pagination: {
        page,
        limit,
        total: Number(countRows[0].total),
        totalPages: Math.ceil(Number(countRows[0].total) / limit)
      }
    });
  } catch (error) {
    return next(error);
  }
});

// GET A CLAIM WITH PRIVATE REVIEW MATERIAL
router.get('/claims/:id', async (request, response, next) => {
  const claimId = parsePositiveId(request.params.id);
  if (!claimId) return response.status(400).json({ message: 'Invalid claim ID.' });

  try {
    const [rows] = await database.execute(
      `${claimSelect} WHERE c.id = ? LIMIT 1`,
      [claimId]
    );
    if (!rows.length) return response.status(404).json({ message: 'Claim not found.' });

    return response.json({
      claim: {
        ...adminClaimResponse(rows[0]),
        legacyEvidenceText: null,
        evidenceFiles: []
      }
    });
  } catch (error) {
    return next(error);
  }
});

// APPROVE OR REJECT A PENDING CLAIM
router.patch('/claims/:id', async (request, response, next) => {
  const claimId = parsePositiveId(request.params.id);
  if (!claimId) return response.status(400).json({ message: 'Invalid claim ID.' });

  const nextStatus = getReviewStatus(request.body?.decision);
  const reviewNoteError = validateReviewNote(nextStatus, request.body?.reviewNote);
  if (
    !request.body ||
    Object.keys(request.body).some((key) => !['decision', 'reviewNote'].includes(key)) ||
    !nextStatus ||
    reviewNoteError
  ) {
    return response.status(400).json({ message: reviewNoteError || 'Decision must be APPROVE or REJECT with an optional reviewNote.' });
  }

  let connection;
  try {
    connection = await database.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT c.status, c.report_id, r.status AS report_status
       FROM claims c JOIN reports r ON r.id = c.report_id
       WHERE c.id = ? LIMIT 1 FOR UPDATE`,
      [claimId]
    );

    if (!rows.length) {
      await connection.rollback();
      return response.status(404).json({ message: 'Claim not found.' });
    }
    if (!canReviewClaim(rows[0].status)) {
      await connection.rollback();
      return response.status(409).json({ message: 'Only pending claims can be reviewed.' });
    }
    if (nextStatus === 'APPROVED' && rows[0].report_status !== 'OPEN') {
      await connection.rollback();
      return response.status(409).json({ message: 'Only claims for open reports can be approved.' });
    }

    await connection.execute(
      `UPDATE claims SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, review_note = ?
       WHERE id = ? AND status = 'PENDING'`,
      [nextStatus, request.user.id, request.body.reviewNote?.trim() || null, claimId]
    );
    await writeAdminAudit(connection, request.user, null, 'claim.reviewed', {
      claimId,
      decision: nextStatus,
      reportId: Number(rows[0].report_id)
    });
    await connection.commit();
    return response.json({ message: `Claim ${nextStatus.toLowerCase()} successfully.`, claim: { id: claimId, status: nextStatus } });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch { /* keep the original error */ }
    }
    if (isApprovedClaimConflict(error) && nextStatus === 'APPROVED') {
      return response.status(409).json({ message: 'Another claim has already been approved for this item.' });
    }
    return next(error);
  } finally {
    connection?.release();
  }
});

// CONFIRM THE PHYSICAL HANDOVER AFTER A CLAIM WAS APPROVED
router.post('/claims/:id/complete', async (request, response, next) => {
  const claimId = parsePositiveId(request.params.id);
  if (!claimId) return response.status(400).json({ message: 'Invalid claim ID.' });
  if (request.body && Object.keys(request.body).length > 0) {
    return response.status(400).json({ message: 'This action does not accept request fields.' });
  }

  let connection;
  try {
    connection = await database.getConnection();
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT c.status AS claim_status, c.report_id, r.status AS report_status
       FROM claims c JOIN reports r ON r.id = c.report_id
       WHERE c.id = ? LIMIT 1 FOR UPDATE`,
      [claimId]
    );

    if (!rows.length) {
      await connection.rollback();
      return response.status(404).json({ message: 'Claim not found.' });
    }
    if (!canCompleteClaim(rows[0].claim_status, rows[0].report_status)) {
      await connection.rollback();
      return response.status(409).json({ message: 'Only an approved claim for an open report can be completed.' });
    }

    await connection.execute(
      `UPDATE reports SET status = 'RETURNED', returned_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'OPEN'`,
      [rows[0].report_id]
    );
    await writeAdminAudit(connection, request.user, null, 'claim.handover_completed', {
      claimId,
      reportId: Number(rows[0].report_id)
    });
    await connection.commit();
    return response.json({ message: 'Handover completed.', claim: { id: claimId, status: 'APPROVED' }, report: { id: rows[0].report_id, status: 'RETURNED' } });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch { /* keep the original error */ }
    }
    return next(error);
  } finally {
    connection?.release();
  }
});

export default router;
