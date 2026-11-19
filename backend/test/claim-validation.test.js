import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAccessEvidence,
  canCompleteClaim,
  canReviewClaim,
  getReviewStatus,
  hasActiveClaim,
  isApprovedClaimConflict,
  parsePositiveId,
  validateClaimReport,
  validateJustification,
  validateReviewNote
} from '../src/services/claim-validation.js';
import { adminOnly, studentOnly } from '../src/middleware/auth.middleware.js';

test('parses only positive safe integer IDs', () => {
  assert.equal(parsePositiveId('42'), 42);
  assert.equal(parsePositiveId('0'), null);
  assert.equal(parsePositiveId('-1'), null);
  assert.equal(parsePositiveId('1.2'), null);
  assert.equal(parsePositiveId('9007199254740992'), null);
});

test('requires a trimmed justification within the database text limit', () => {
  assert.match(validateJustification(undefined), /required/);
  assert.match(validateJustification('short'), /at least 10/);
  assert.equal(validateJustification('  I can describe the unique mark.  '), null);
  assert.match(validateJustification('x'.repeat(65536)), /65,535 UTF-8 bytes/);
});

test('rejects missing, non-found, self-reported, and ineligible reports', () => {
  assert.equal(validateClaimReport(null, 9).status, 404);
  assert.equal(validateClaimReport({ report_type: 'LOST', reporter_id: 8, status: 'OPEN' }, 9).status, 400);
  assert.equal(validateClaimReport({ report_type: 'FOUND', reporter_id: 9, status: 'OPEN' }, 9).status, 403);
  assert.equal(validateClaimReport({ report_type: 'FOUND', reporter_id: 8, status: 'RETURNED' }, 9).status, 409);
  assert.equal(validateClaimReport({ report_type: 'FOUND', reporter_id: 8, status: 'OPEN' }, 9), null);
});

test('detects duplicate active claims and allows non-active history', () => {
  assert.equal(hasActiveClaim([{ status: 'PENDING' }]), true);
  assert.equal(hasActiveClaim([{ status: 'APPROVED' }]), true);
  assert.equal(hasActiveClaim([{ status: 'REJECTED' }, { status: 'WITHDRAWN' }]), false);
});

test('evidence access is limited to its owner or an administrator', () => {
  assert.equal(canAccessEvidence('STUDENT', '12', 12), true);
  assert.equal(canAccessEvidence('STUDENT', 13, 12), false);
  assert.equal(canAccessEvidence('ADMIN', 13, 12), true);
});

test('claim decisions and handover follow the allowed state transitions', () => {
  assert.equal(getReviewStatus('APPROVE'), 'APPROVED');
  assert.equal(getReviewStatus('REJECT'), 'REJECTED');
  assert.equal(getReviewStatus('WITHDRAWN'), null);
  assert.equal(canReviewClaim('PENDING'), true);
  assert.equal(canReviewClaim('APPROVED'), false);
  assert.equal(canCompleteClaim('APPROVED', 'OPEN'), true);
  assert.equal(canCompleteClaim('PENDING', 'OPEN'), false);
  assert.equal(canCompleteClaim('APPROVED', 'RETURNED'), false);
});

test('requires a useful reason for rejection and bounds review notes', () => {
  assert.equal(validateReviewNote('APPROVED', ''), null);
  assert.match(validateReviewNote('APPROVED', 'no'), /at least 5/);
  assert.match(validateReviewNote('REJECTED', ''), /required/);
  assert.match(validateReviewNote('REJECTED', 'no'), /at least 5/);
  assert.equal(validateReviewNote('REJECTED', 'Item details do not match.'), null);
  assert.match(validateReviewNote('APPROVED', 'x'.repeat(2001)), /2,000 UTF-8 bytes/);
});

test('duplicate approval database conflicts are recognized', () => {
  assert.equal(isApprovedClaimConflict({ code: 'ER_DUP_ENTRY' }), true);
  assert.equal(isApprovedClaimConflict({ code: 'ER_BAD_FIELD_ERROR' }), false);
});

test('review authorization middleware rejects students and allows admins', () => {
  const response = {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
  let continued = false;

  adminOnly({ user: { role: 'STUDENT' } }, response, () => { continued = true; });
  assert.equal(response.statusCode, 403);
  assert.equal(continued, false);

  adminOnly({ user: { role: 'ADMIN' } }, response, () => { continued = true; });
  assert.equal(continued, true);

  continued = false;
  studentOnly({ user: { role: 'ADMIN' } }, response, () => { continued = true; });
  assert.equal(response.statusCode, 403);
  assert.equal(continued, false);
});
