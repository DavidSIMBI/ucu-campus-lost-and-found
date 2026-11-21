import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { database } from '../src/config/database.js';
import app from '../src/app.js';

const testSecret = 'claims-api-test-secret-only';
const claimRow = {
  id: 101,
  report_id: 44,
  status: 'PENDING',
  justification: 'I can identify a distinctive mark.',
  created_at: '2026-11-18T12:00:00.000Z',
  reviewed_at: null,
  review_note: null,
  reviewer_name: null,
  report_title: 'Found notebook',
  report_category: 'Books',
  report_location: 'Main Library',
  report_event_date: '2026-11-17',
  report_status: 'OPEN',
  claimant_id: 1,
  claimant_name: 'Test Student',
  claimant_email: 'test.student@example.invalid',
  report_type: 'FOUND',
  reporter_id: 99
};

function tokenFor(id, role) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const content = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: String(id), role, ver: 0, iat: 1, exp: 4102444800 })}`;
  return `${content}.${createHmac('sha256', testSecret).update(content).digest('base64url')}`;
}

test('claims and admin APIs enforce ownership and state using isolated database mocks', async () => {
  const previousSecret = process.env.JWT_SECRET;
  const previousStorage = process.env.CLAIM_EVIDENCE_STORAGE_DIR;
  const storageDirectory = await mkdtemp(path.join(os.tmpdir(), 'ucu-claims-api-'));
  process.env.JWT_SECRET = testSecret;
  process.env.CLAIM_EVIDENCE_STORAGE_DIR = storageDirectory;

  let duplicateSubmission = false;
  let duplicateApproval = false;
  let reportOwnerId = 99;
  let evidenceOwner = 1;
  let lastStorageKey;
  let reviewDecision;
  let handoverUpdated = false;
  let auditWrites = 0;

  const executeMock = mock.method(database, 'execute', async (sql, values = []) => {
    if (sql.includes('SELECT id, role, token_version, is_active')) {
      const id = Number(values[0]);
      return [[{ id, role: id === 2 ? 'ADMIN' : 'STUDENT', token_version: 0, is_active: 1 }], []];
    }
    if (sql.includes('FROM users WHERE role = \'STUDENT\'')) return [[{ total: 8 }], []];
    if (sql.includes('FROM users WHERE role = \'SUPER_ADMIN\'')) return [[{ total: 1 }], []];
    if (sql.includes('SELECT COUNT(*) AS total FROM users')) return [[{ total: 10 }], []];
    if (sql.includes('FROM reports WHERE report_type = \'LOST\'')) return [[{ total: 3 }], []];
    if (sql.includes('FROM reports WHERE report_type = \'FOUND\'')) return [[{ total: 4 }], []];
    if (sql.includes('FROM reports WHERE status = \'RETURNED\'')) return [[{ total: 2 }], []];
    if (sql.includes('SELECT COUNT(*) AS total FROM reports')) return [[{ total: 7 }], []];
    if (sql.includes('SUM(status = \'PENDING\')')) return [[{ total: 3, pending: 1, approved: 1, rejected: 1 }], []];
    if (sql.includes('FROM reports r JOIN users reporter')) return [[{ id: 44, title: 'Found notebook', report_type: 'FOUND', status: 'OPEN', created_at: '2026-11-18T12:00:00.000Z', reporter_name: 'Report Owner' }], []];
    if (sql.includes('FROM claims c') && sql.includes('c.claimant_id = ?')) {
      const requestedStudentId = Number(values.at(-1));
      if (requestedStudentId !== 1) return [[], []];
      return [[claimRow], []];
    }
    if (sql.includes('SELECT f.storage_key')) {
      return [[{ storage_key: lastStorageKey, original_filename: 'proof.pdf', mime_type: 'application/pdf', file_size: 8, claimant_id: evidenceOwner }], []];
    }
    if (sql.includes('FROM claim_evidence_files WHERE claim_id')) {
      return [[{ id: 501, original_filename: 'proof.pdf', mime_type: 'application/pdf', file_size: 8, uploaded_at: '2026-11-18T12:00:00.000Z' }], []];
    }
    if (sql.includes('SELECT evidence_text FROM claim_evidence')) return [[], []];
    if (sql.includes('SELECT COUNT(*) AS total') && sql.includes('FROM claims c')) return [[{ total: 0 }], []];
    if (sql.includes('SELECT COUNT(*) AS total FROM users')) return [[{ total: 1 }], []];
    if (sql.includes('SELECT id, full_name, email, role, created_at')) return [[{ id: 1, full_name: 'Test Student', email: 'test.student@example.invalid', role: 'STUDENT', created_at: '2026-11-18T12:00:00.000Z' }], []];
    if (sql.includes('SELECT COUNT(*) AS total FROM users')) return [[{ total: 1 }], []];
    if (sql.includes('FROM claims c') && sql.includes('LIMIT ? OFFSET ?')) return [[], []];
    if (sql.includes('FROM claims c')) return [[claimRow], []];
    return [[], []];
  });

  const connection = {
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
    async execute(sql, values = []) {
      if (sql.includes('INSERT INTO admin_audit_log')) {
        auditWrites += 1;
        return [{ insertId: auditWrites }, []];
      }
      if (sql.includes('FROM reports WHERE id = ?')) {
        return [[{ id: 44, reporter_id: reportOwnerId, report_type: 'FOUND', title: 'Found notebook', category: 'Books', location: 'Main Library', event_date: '2026-11-17', status: 'OPEN' }], []];
      }
      if (sql.includes("status = 'APPROVED'")) return [[], []];
      if (sql.includes("status IN ('PENDING', 'APPROVED')")) {
        return duplicateSubmission ? [[{ id: 90, status: 'PENDING' }], []] : [[], []];
      }
      if (sql.includes('INSERT INTO claims')) return [{ insertId: 101 }, []];
      if (sql.includes('INSERT INTO claim_evidence_files')) {
        lastStorageKey = values[2];
        return [{ insertId: 501 }, []];
      }
      if (sql.includes('SELECT id, original_filename')) {
        return [[{ id: 501, original_filename: 'proof.pdf', mime_type: 'application/pdf', file_size: 8, uploaded_at: '2026-11-18T12:00:00.000Z' }], []];
      }
      if (sql.includes('SELECT c.status, c.report_id')) return [[{ status: 'PENDING', report_id: 44, report_status: 'OPEN' }], []];
      if (sql.includes('SELECT c.status AS claim_status')) return [[{ claim_status: 'APPROVED', report_id: 44, report_status: 'OPEN' }], []];
      if (sql.includes('UPDATE claims SET status')) {
        if (duplicateApproval) {
          const error = new Error('duplicate approved claim');
          error.code = 'ER_DUP_ENTRY';
          throw error;
        }
        reviewDecision = true;
        return [{ affectedRows: 1 }, []];
      }
      if (sql.includes("UPDATE reports SET status = 'RETURNED'")) {
        handoverUpdated = true;
        return [{ affectedRows: 1 }, []];
      }
      return [[], []];
    }
  };
  const connectionMock = mock.method(database, 'getConnection', async () => connection);

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const headersFor = (id, role) => ({ Authorization: `Bearer ${tokenFor(id, role)}` });

  try {
    let response = await fetch(`${base}/api/claims/mine`);
    assert.equal(response.status, 401);

    response = await fetch(`${base}/api/claims/not-an-id`, { headers: headersFor(1, 'STUDENT') });
    assert.equal(response.status, 400);

    response = await fetch(`${base}/api/claims/101`, { headers: headersFor(3, 'STUDENT') });
    assert.equal(response.status, 404, 'a student cannot view another student’s claim');

    response = await fetch(`${base}/api/claims/101`, { headers: headersFor(1, 'STUDENT') });
    assert.equal(response.status, 200, 'the claim owner can view their claim');

    response = await fetch(`${base}/api/admin/claims`, { headers: headersFor(1, 'STUDENT') });
    assert.equal(response.status, 403, 'students cannot access admin review endpoints');

    const form = new FormData();
    form.append('reportId', '44');
    form.append('justification', 'I can identify the distinctive mark.');
    form.append('evidenceFiles', new Blob([Buffer.from('%PDF-1.7')], { type: 'application/pdf' }), 'proof.pdf');
    response = await fetch(`${base}/api/claims`, { method: 'POST', headers: headersFor(1, 'STUDENT'), body: form });
    assert.equal(response.status, 201);
    const created = await response.json();
    assert.equal(created.claim.id, 101);
    assert.equal(created.claim.evidenceFiles[0].id, 501);

    reportOwnerId = 1;
    const selfClaimForm = new FormData();
    selfClaimForm.append('reportId', '44');
    selfClaimForm.append('justification', 'I can identify the distinctive mark.');
    selfClaimForm.append('evidenceFiles', new Blob([Buffer.from('%PDF-1.7')], { type: 'application/pdf' }), 'proof.pdf');
    response = await fetch(`${base}/api/claims`, { method: 'POST', headers: headersFor(1, 'STUDENT'), body: selfClaimForm });
    assert.equal(response.status, 403, 'a student cannot claim a report they submitted');
    reportOwnerId = 99;

    duplicateSubmission = true;
    const duplicateForm = new FormData();
    duplicateForm.append('reportId', '44');
    duplicateForm.append('justification', 'I can identify the distinctive mark.');
    duplicateForm.append('evidenceFiles', new Blob([Buffer.from('%PDF-1.7')], { type: 'application/pdf' }), 'proof.pdf');
    response = await fetch(`${base}/api/claims`, { method: 'POST', headers: headersFor(1, 'STUDENT'), body: duplicateForm });
    assert.equal(response.status, 409);
    duplicateSubmission = false;

    response = await fetch(`${base}/api/claims/101/evidence/501`, { headers: headersFor(3, 'STUDENT') });
    assert.equal(response.status, 404, 'another student cannot download the evidence');

    response = await fetch(`${base}/api/claims/101/evidence/501`, { headers: headersFor(1, 'STUDENT') });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(await response.text(), '%PDF-1.7');

    evidenceOwner = 99;
    response = await fetch(`${base}/api/claims/101/evidence/501`, { headers: headersFor(2, 'ADMIN') });
    assert.equal(response.status, 200, 'an authenticated admin can download claim evidence');

    response = await fetch(`${base}/api/admin/claims`, { headers: headersFor(2, 'ADMIN') });
    assert.equal(response.status, 200);

    response = await fetch(`${base}/api/admin/claims/101`, { headers: headersFor(2, 'ADMIN') });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).claim.claimant.email, 'test.student@example.invalid');

    response = await fetch(`${base}/api/admin/users`, { headers: headersFor(2, 'ADMIN') });
    assert.equal(response.status, 200);

    response = await fetch(`${base}/api/admin/dashboard`, { headers: headersFor(2, 'ADMIN') });
    assert.equal(response.status, 200);
    const dashboard = await response.json();
    assert.equal(Number(dashboard.statistics.pendingClaims), 1);
    assert.equal(Number(dashboard.statistics.totalAdmins), 1);
    assert.equal(Number(dashboard.statistics.returnedItems), 2);
    assert.equal(dashboard.recentReports[0].title, 'Found notebook');

    response = await fetch(`${base}/api/admin/claims/101`, {
      method: 'PATCH', headers: { ...headersFor(1, 'STUDENT'), 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'APPROVE' })
    });
    assert.equal(response.status, 403);

    response = await fetch(`${base}/api/admin/claims/101`, {
      method: 'PATCH', headers: { ...headersFor(2, 'ADMIN'), 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'REJECT' })
    });
    assert.equal(response.status, 400, 'rejection requires an explanatory review note');

    response = await fetch(`${base}/api/admin/claims/101`, {
      method: 'PATCH', headers: { ...headersFor(2, 'ADMIN'), 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'APPROVE' })
    });
    assert.equal(response.status, 200);
    assert.equal(reviewDecision, true);

    duplicateApproval = true;
    response = await fetch(`${base}/api/admin/claims/101`, {
      method: 'PATCH', headers: { ...headersFor(2, 'ADMIN'), 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'APPROVE' })
    });
    assert.equal(response.status, 409);
    duplicateApproval = false;

    response = await fetch(`${base}/api/admin/claims/101/complete`, {
      method: 'POST', headers: headersFor(2, 'ADMIN')
    });
    assert.equal(response.status, 200);
    assert.equal(handoverUpdated, true);
    assert.equal(auditWrites, 2, 'claim decisions and completed handovers are audited transactionally');
    assert.equal(connectionMock.mock.callCount(), 6);
    assert.ok(executeMock.mock.callCount() > 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    mock.restoreAll();
    await rm(storageDirectory, { recursive: true, force: true });
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
    if (previousStorage === undefined) delete process.env.CLAIM_EVIDENCE_STORAGE_DIR;
    else process.env.CLAIM_EVIDENCE_STORAGE_DIR = previousStorage;
  }
});
