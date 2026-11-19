import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminModuleShell from '../components/AdminModuleShell.jsx';
import ClaimStatusBadge from '../components/ClaimStatusBadge.jsx';
import { ClaimError, ClaimLoading } from '../components/ClaimState.jsx';
import useAdminSession from '../hooks/useAdminSession.js';
import { downloadBlob, getEvidenceFile } from '../services/claimsService.js';
import { completeHandover, getAdminClaim, reviewClaim } from '../services/adminService.js';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function formatEventDate(value) {
  const raw = String(value ?? '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return raw.slice(0, 10) || '—';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Kampala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

function isValidClaimReview(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    value.id != null &&
    value.report &&
    typeof value.report === 'object' &&
    !Array.isArray(value.report) &&
    value.claimant &&
    typeof value.claimant === 'object' &&
    !Array.isArray(value.claimant) &&
    (value.evidenceFiles == null || Array.isArray(value.evidenceFiles))
  );
}

export default function AdminClaimDetailPage() {
  const { id } = useParams();
  const handleUnauthorized = useAdminSession();
  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setClaim(null);

    async function loadClaim() {
      try {
        const result = await getAdminClaim(id, { signal: controller.signal });
        if (!isValidClaimReview(result)) {
          setError('This claim is unavailable or its details could not be loaded.');
          return;
        }
        setClaim(result);
        setReviewNote(result.reviewNote || '');
      } catch (requestError) {
        if (controller.signal.aborted || await handleUnauthorized(requestError)) return;
        setError(requestError.response?.data?.message || 'Unable to load this claim.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadClaim();
    return () => controller.abort();
  }, [id, retry, handleUnauthorized]);

  async function decide(decision) {
    if (decision === 'REJECT' && reviewNote.trim().length < 5) {
      setActionError('Add a review reason of at least 5 characters before rejecting.');
      return;
    }
    const action = decision === 'APPROVE' ? 'approve' : 'reject';
    if (!window.confirm(`Confirm that you want to ${action} this claim?`)) return;
    setBusy(true);
    setActionError('');
    try {
      await reviewClaim(id, decision, reviewNote);
      setRetry((value) => value + 1);
    } catch (requestError) {
      if (await handleUnauthorized(requestError)) return;
      setActionError(requestError.response?.data?.message || 'Unable to record this decision.');
    } finally { setBusy(false); }
  }

  async function confirmHandover() {
    if (!window.confirm('Confirm that the item has physically been handed over to this claimant?')) return;
    setBusy(true);
    setActionError('');
    try {
      await completeHandover(id);
      setRetry((value) => value + 1);
    } catch (requestError) {
      if (await handleUnauthorized(requestError)) return;
      setActionError(requestError.response?.data?.message || 'Unable to complete handover.');
    } finally { setBusy(false); }
  }

  async function downloadEvidence(file) {
    setBusy(true);
    setActionError('');
    try {
      downloadBlob(await getEvidenceFile(id, file.id), file.originalFilename);
    } catch (requestError) {
      if (await handleUnauthorized(requestError)) return;
      setActionError(requestError.response?.data?.message || 'Unable to access this evidence file.');
    } finally { setBusy(false); }
  }

  return <AdminModuleShell title="Claim review" eyebrow="Administration / Claims / Review">
    <div className="admin-detail-back"><Link className="text-link" to="/admin/claims">← Back to claims queue</Link></div>
    {loading && <ClaimLoading>Loading claim review…</ClaimLoading>}
    {!loading && error && <ClaimError message={error} onRetry={() => setRetry((value) => value + 1)} />}
    {!loading && !error && claim && <div className="admin-claim-detail-grid">
      <article className="module-panel admin-review-main">
        <header className="claim-summary-heading"><div><p className="section-label">Claim reference #{claim.id}</p><h2>{claim.report.title}</h2></div><ClaimStatusBadge status={claim.status} /></header>
        <div className="claim-detail-section"><h3>Student justification</h3><p className="claim-justification-full">{claim.justification || 'No written justification was recorded for this historical claim.'}</p></div>
        {claim.legacyEvidenceText && <div className="claim-detail-section"><h3>Previously submitted evidence</h3><p>{claim.legacyEvidenceText}</p></div>}
        <div className="claim-detail-section"><h3>Supporting evidence</h3>{claim.evidenceFiles?.length ? <ul className="evidence-download-list">{claim.evidenceFiles.map((file) => <li key={file.id}><span><strong>{file.originalFilename}</strong><small>{file.mimeType} · {(Number(file.fileSize) / (1024 * 1024)).toFixed(2)} MB</small></span><button className="button button-small" type="button" disabled={busy} onClick={() => downloadEvidence(file)}>Download</button></li>)}</ul> : <p>No uploaded files are associated with this claim.</p>}</div>
        <dl className="detail-grid"><div><dt>Submitted</dt><dd>{formatDate(claim.submittedAt)}</dd></div><div><dt>Report status</dt><dd>{claim.report.status}</dd></div><div><dt>Review status</dt><dd><ClaimStatusBadge status={claim.status} /></dd></div><div><dt>Handover</dt><dd>{claim.status === 'APPROVED' ? (claim.report.status === 'RETURNED' ? 'Completed' : 'Pending') : '—'}</dd></div></dl>
      </article>

      <aside className="admin-review-aside">
        <section className="module-panel"><p className="section-label">Claimant</p><h2>{claim.claimant.fullName}</h2><a href={`mailto:${claim.claimant.email}`}>{claim.claimant.email}</a><p className="field-help">Claim ID {claim.id}</p></section>
        <section className="module-panel"><p className="section-label">Found item</p><h2>{claim.report.title}</h2><dl className="review-facts"><div><dt>Category</dt><dd>{claim.report.category}</dd></div><div><dt>Location</dt><dd>{claim.report.location}</dd></div><div><dt>Event date</dt><dd>{formatEventDate(claim.report.eventDate)}</dd></div></dl></section>
        {claim.reviewedAt && <section className="module-panel"><p className="section-label">Previous review</p><p>{claim.reviewNote || 'No review note was recorded.'}</p><small>{claim.reviewer?.fullName || 'Administrator'} · {formatDate(claim.reviewedAt)}</small></section>}
        {claim.status === 'PENDING' && <section className="module-panel admin-decision-panel"><label className="module-field" htmlFor="review-note">Review note {claim.status === 'PENDING' && <small>(required to reject)</small>}<textarea id="review-note" value={reviewNote} maxLength={2000} rows={4} onChange={(event) => setReviewNote(event.target.value)} placeholder="Explain your decision for the student." /></label><div className="admin-decision-actions"><button className="button" type="button" disabled={busy} onClick={() => decide('APPROVE')}>Approve</button><button className="button button-danger" type="button" disabled={busy} onClick={() => decide('REJECT')}>Reject</button></div></section>}
        {claim.status === 'APPROVED' && claim.report.status === 'OPEN' && <section className="module-panel handover-panel"><p className="section-label">Handover pending</p><p>Confirm only after the item has been physically handed to the claimant.</p><button className="button" type="button" disabled={busy} onClick={confirmHandover}>Confirm handover</button></section>}
        {claim.status === 'APPROVED' && claim.report.status === 'RETURNED' && <section className="module-panel handover-complete"><p className="section-label">Handover complete</p><p>The report is marked returned.</p></section>}
      </aside>
      {actionError && <p className="module-feedback module-feedback-error admin-action-error" role="alert">{actionError}</p>}
    </div>}
  </AdminModuleShell>;
}
