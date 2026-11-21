import { Router } from 'express';
import { database } from '../config/database.js';
import { authenticate, studentOnly } from '../middleware/auth.middleware.js';
import { requireEnabledSetting } from '../services/admin-settings.service.js';
import { parseClaimEvidence } from '../middleware/claim-evidence-upload.js';
import {
  getEvidenceStorageDirectory,
  readEvidenceBuffer,
  removeEvidenceFiles,
  sanitizeOriginalFilename,
  storeEvidenceBuffer,
  validateEvidenceFile
} from '../services/evidence-storage.js';
import {
  canAccessEvidence,
  hasActiveClaim,
  parsePositiveId,
  validateClaimReport,
  validateJustification
} from '../services/claim-validation.js';

const router = Router();

router.use(authenticate);

function safeFileResponse(file) {
  return {
    id: file.id,
    originalFilename: file.original_filename,
    mimeType: file.mime_type,
    fileSize: file.file_size,
    uploadedAt: file.uploaded_at
  };
}

function toClaim(row) {
  return {
    id: row.id,
    status: row.status,
    justification: row.justification,
    submittedAt: row.created_at,
    reviewedAt: row.reviewed_at,
    reviewNote: row.review_note ?? null,
    reviewerName: row.reviewer_name ?? null,
    report: {
      id: row.report_id,
      title: row.report_title,
      category: row.report_category,
      location: row.report_location,
      eventDate: row.report_event_date,
      status: row.report_status
    }
  };
}

router.post('/', studentOnly, requireEnabledSetting(
  'claim_submissions_enabled',
  'New claim submissions are temporarily disabled.'
), parseClaimEvidence, async (request, response, next) => {
  const reportId = parsePositiveId(request.body?.reportId);
  const justificationError = validateJustification(request.body?.justification);
  const files = request.files ?? [];

  if (!reportId) {
    return response.status(400).json({ message: 'A valid reportId is required.' });
  }

  if (justificationError) {
    return response.status(400).json({ message: justificationError });
  }

  if (files.length < 1 || files.length > 5) {
    return response.status(400).json({ message: 'Attach between 1 and 5 evidence files.' });
  }

  for (const file of files) {
    const fileError = validateEvidenceFile(file);
    if (fileError) return response.status(400).json({ message: fileError });
  }

  let connection;
  const storedKeys = [];
  let storageDirectory;

  try {
    storageDirectory = getEvidenceStorageDirectory();
    connection = await database.getConnection();
    await connection.beginTransaction();

    const [reports] = await connection.execute(
      `SELECT id, reporter_id, report_type, title, category, location, event_date, status
       FROM reports WHERE id = ? LIMIT 1 FOR UPDATE`,
      [reportId]
    );
    const report = reports[0];

    const reportError = validateClaimReport(report, request.user.id);
    if (reportError) {
      await connection.rollback();
      return response.status(reportError.status).json({ message: reportError.message });
    }

    const [approvedClaims] = await connection.execute(
      `SELECT id FROM claims WHERE report_id = ? AND status = 'APPROVED' LIMIT 1 FOR UPDATE`,
      [reportId]
    );
    if (approvedClaims.length) {
      await connection.rollback();
      return response.status(409).json({ message: 'This item already has an approved claim.' });
    }

    const [existingClaims] = await connection.execute(
      `SELECT id, status FROM claims
       WHERE report_id = ? AND claimant_id = ? AND status IN ('PENDING', 'APPROVED')
       LIMIT 1 FOR UPDATE`,
      [reportId, request.user.id]
    );
    if (hasActiveClaim(existingClaims)) {
      await connection.rollback();
      return response.status(409).json({ message: 'You already have an active claim for this item.' });
    }

    const [result] = await connection.execute(
      `INSERT INTO claims (report_id, claimant_id, justification)
       VALUES (?, ?, ?)`,
      [reportId, request.user.id, request.body.justification.trim()]
    );

    for (const file of files) {
      const storageKey = await storeEvidenceBuffer(file.buffer, storageDirectory);
      storedKeys.push(storageKey);

      await connection.execute(
        `INSERT INTO claim_evidence_files
           (claim_id, original_filename, storage_key, mime_type, file_size)
         VALUES (?, ?, ?, ?, ?)`,
        [
          result.insertId,
          sanitizeOriginalFilename(file.originalname),
          storageKey,
          file.mimetype,
          file.size
        ]
      );
    }

    const [savedFiles] = await connection.execute(
      `SELECT id, original_filename, mime_type, file_size, uploaded_at
       FROM claim_evidence_files WHERE claim_id = ? ORDER BY id`,
      [result.insertId]
    );

    await connection.commit();
    return response.status(201).json({
      message: 'Claim submitted successfully.',
      claim: {
        id: result.insertId,
        reportId,
        status: 'PENDING',
        submittedAt: new Date().toISOString(),
        evidenceFiles: savedFiles.map(safeFileResponse)
      }
    });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch { /* keep the original error */ }
    }

    if (storageDirectory && storedKeys.length > 0) {
      try {
        await removeEvidenceFiles(storedKeys, storageDirectory);
      } catch {
        console.error('Unable to clean up evidence files after a failed claim transaction.');
      }
    }

    return next(error);
  } finally {
    connection?.release();
  }
});

router.get('/mine', studentOnly, async (request, response, next) => {
  try {
    const [rows] = await database.execute(
      `SELECT c.id, c.report_id, c.status, NULL AS justification, c.created_at,
              c.reviewed_at, NULL AS review_note, reviewer.full_name AS reviewer_name,
              r.title AS report_title, r.category AS report_category,
              r.location AS report_location,
              DATE_FORMAT(r.event_date, '%Y-%m-%d') AS report_event_date,
              r.status AS report_status
       FROM claims c
       JOIN reports r ON r.id = c.report_id
       LEFT JOIN users reviewer ON reviewer.id = c.reviewed_by
       WHERE c.claimant_id = ?
       ORDER BY c.created_at DESC, c.id DESC`,
      [request.user.id]
    );

    return response.json({ claims: rows.map(toClaim) });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id/evidence/:fileId', async (request, response, next) => {
  const claimId = parsePositiveId(request.params.id);
  const fileId = parsePositiveId(request.params.fileId);
  if (!claimId || !fileId) {
    return response.status(400).json({ message: 'Invalid claim or evidence file ID.' });
  }

  try {
    const [rows] = await database.execute(
      `SELECT f.storage_key, f.original_filename, f.mime_type, f.file_size,
              c.claimant_id
       FROM claim_evidence_files f
       JOIN claims c ON c.id = f.claim_id
       WHERE c.id = ? AND f.id = ? LIMIT 1`,
      [claimId, fileId]
    );
    const file = rows[0];

    if (!file || !canAccessEvidence(request.user.role, file.claimant_id, request.user.id)) {
      return response.status(404).json({ message: 'Evidence file not found.' });
    }

    const content = await readEvidenceBuffer(file.storage_key);
    const filename = sanitizeOriginalFilename(file.original_filename).replace(/["\\\r\n]/g, '_');
    const encodedFilename = encodeURIComponent(filename).replace(/['()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);

    response.set({
      'Content-Type': file.mime_type,
      'Content-Length': String(content.length),
      'Content-Disposition': `attachment; filename="${filename.replace(/[^\x20-\x7e]/g, '_')}"; filename*=UTF-8''${encodedFilename}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store'
    });
    return response.status(200).send(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return response.status(404).json({ message: 'Evidence file is unavailable.' });
    }
    return next(error);
  }
});

router.get('/:id', studentOnly, async (request, response, next) => {
  const claimId = parsePositiveId(request.params.id);
  if (!claimId) return response.status(400).json({ message: 'Invalid claim ID.' });

  try {
    const [rows] = await database.execute(
      `SELECT c.id, c.report_id, c.status, NULL AS justification, c.created_at,
              c.reviewed_at, NULL AS review_note, reviewer.full_name AS reviewer_name,
              r.title AS report_title, r.category AS report_category,
              r.location AS report_location,
              DATE_FORMAT(r.event_date, '%Y-%m-%d') AS report_event_date,
              r.status AS report_status
       FROM claims c
       JOIN reports r ON r.id = c.report_id
       LEFT JOIN users reviewer ON reviewer.id = c.reviewed_by
       WHERE c.id = ? AND c.claimant_id = ? LIMIT 1`,
      [claimId, request.user.id]
    );

    if (!rows.length) return response.status(404).json({ message: 'Claim not found.' });

    return response.json({
      claim: {
        ...toClaim(rows[0]),
        legacyEvidenceText: null,
        evidenceFiles: []
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id', studentOnly, async (request, response, next) => {
  const claimId = parsePositiveId(request.params.id);
  if (!claimId) return response.status(400).json({ message: 'Invalid claim ID.' });

  if (
    !request.body ||
    Object.keys(request.body).length !== 1 ||
    request.body.action !== 'WITHDRAW'
  ) {
    return response.status(400).json({ message: 'Only the WITHDRAW action is allowed.' });
  }

  let connection;
  try {
    connection = await database.getConnection();
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT id, status FROM claims WHERE id = ? AND claimant_id = ? LIMIT 1 FOR UPDATE`,
      [claimId, request.user.id]
    );

    if (!rows.length) {
      await connection.rollback();
      return response.status(404).json({ message: 'Claim not found.' });
    }
    if (rows[0].status !== 'PENDING') {
      await connection.rollback();
      return response.status(409).json({ message: 'Only pending claims can be withdrawn.' });
    }

    await connection.execute(
      `UPDATE claims SET status = 'WITHDRAWN' WHERE id = ? AND claimant_id = ? AND status = 'PENDING'`,
      [claimId, request.user.id]
    );
    await connection.commit();
    return response.json({ message: 'Claim withdrawn successfully.', claim: { id: claimId, status: 'WITHDRAWN' } });
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
