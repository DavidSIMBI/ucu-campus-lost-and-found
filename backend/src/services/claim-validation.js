export function parsePositiveId(value) {
  if (!/^[1-9]\d*$/.test(String(value))) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function validateJustification(value) {
  if (typeof value !== 'string') return 'A written justification is required.';

  const justification = value.trim();
  if (justification.length < 10) {
    return 'Justification must contain at least 10 characters.';
  }

  if (Buffer.byteLength(justification, 'utf8') > 65535) {
    return 'Justification must be 65,535 UTF-8 bytes or fewer.';
  }

  return null;
}

export function validateReviewNote(decision, value) {
  const rejecting = decision === 'REJECT' || decision === 'REJECTED';
  if (value === undefined || value === null || value === '') {
    return rejecting
      ? 'A review note is required when rejecting a claim.'
      : null;
  }

  if (typeof value !== 'string') return 'Review note must be text.';
  const note = value.trim();
  if (!note) return rejecting ? 'A review note is required when rejecting a claim.' : null;
  if (note.length < 5) return 'Review note must contain at least 5 characters.';
  if (Buffer.byteLength(note, 'utf8') > 2000) return 'Review note must be 2,000 UTF-8 bytes or fewer.';
  return null;
}

export function validateClaimReport(report, studentId) {
  if (!report) return { status: 404, message: 'Found report not found.' };
  if (report.report_type !== 'FOUND') {
    return { status: 400, message: 'Claims can only be submitted for found items.' };
  }
  if (Number(report.reporter_id) === Number(studentId)) {
    return { status: 403, message: 'You cannot claim an item you reported.' };
  }
  if (report.status !== 'OPEN') {
    return { status: 409, message: 'This report is no longer eligible for claims.' };
  }
  return null;
}

export function hasActiveClaim(rows) {
  return rows.some((row) => ['PENDING', 'APPROVED'].includes(row.status));
}

export function canAccessEvidence(role, claimantId, userId) {
  return role === 'ADMIN' || role === 'SUPER_ADMIN' || Number(claimantId) === Number(userId);
}

export function getReviewStatus(decision) {
  if (decision === 'APPROVE') return 'APPROVED';
  if (decision === 'REJECT') return 'REJECTED';
  return null;
}

export function canReviewClaim(status) {
  return status === 'PENDING';
}

export function canCompleteClaim(claimStatus, reportStatus) {
  return claimStatus === 'APPROVED' && reportStatus === 'OPEN';
}

export function isApprovedClaimConflict(error) {
  return error?.code === 'ER_DUP_ENTRY';
}
