import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ClaimStatusBadge from '../components/ClaimStatusBadge.jsx';
import { ClaimError, ClaimLoading } from '../components/ClaimState.jsx';
import { downloadBlob, getEvidenceFile, getMyClaim, withdrawClaim } from '../services/claimsService.js';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export default function MyClaimDetailPage() {
  const { id } = useParams();
  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);

  async function loadClaim(signal) {
    setLoading(true);
    setError('');
    try { setClaim(await getMyClaim(id, { signal })); }
    catch (requestError) { if (!signal?.aborted) setError(requestError.response?.data?.message || 'Unable to load this claim.'); }
    finally { if (!signal?.aborted) setLoading(false); }
  }

  useEffect(() => {
    const controller = new AbortController();
    loadClaim(controller.signal);
    return () => controller.abort();
  }, [id]);

  async function handleWithdraw() {
    if (!window.confirm('Withdraw this pending claim? This action cannot be undone.')) return;
    setBusy(true);
    setActionError('');
    try {
      await withdrawClaim(id);
      await loadClaim();
    } catch (requestError) {
      setActionError(requestError.response?.data?.message || 'Unable to withdraw this claim.');
    } finally { setBusy(false); }
  }

  async function handleDownload(file) {
    setBusy(true);
    setActionError('');
    try {
      const blob = await getEvidenceFile(id, file.id);
      downloadBlob(blob, file.originalFilename);
    } catch (requestError) {
      setActionError(requestError.response?.data?.message || 'Unable to access this evidence file.');
    } finally { setBusy(false); }
  }

  return <section className="module-page section-shell">
    <Link className="text-link" to="/my-claims">← Back to My Claims</Link>
    {loading && <ClaimLoading>Loading claim details…</ClaimLoading>}
    {!loading && error && <ClaimError message={error} onRetry={() => loadClaim()} />}
    {!loading && !error && claim && <article className="module-panel claim-detail-panel">
      <header className="claim-summary-heading"><div><p className="section-label">Claim reference #{claim.id}</p><h1>{claim.report?.title || 'Found item claim'}</h1></div><ClaimStatusBadge status={claim.status} /></header>
      <dl className="detail-grid"><div><dt>Submitted</dt><dd>{formatDate(claim.submittedAt)}</dd></div><div><dt>Item location</dt><dd>{claim.report?.location || '—'}</dd></div><div><dt>Item category</dt><dd>{claim.report?.category || '—'}</dd></div><div><dt>Handover</dt><dd>{claim.status === 'APPROVED' ? (claim.report?.status === 'RETURNED' ? 'Completed' : 'Awaiting administrator confirmation') : 'Not applicable'}</dd></div></dl>
      <section className="claim-detail-section"><h2>Your justification</h2><p className="claim-justification-full">{claim.justification || 'No written justification was recorded for this historical claim.'}</p></section>
      {claim.reviewedAt && <section className="claim-review-note"><h2>Review decision</h2><p>{claim.reviewNote || (claim.status === 'APPROVED' ? 'Your claim was approved.' : 'Your claim was reviewed.')}</p><small>{claim.reviewerName ? `Reviewed by ${claim.reviewerName} · ` : ''}{formatDate(claim.reviewedAt)}</small></section>}
      {claim.legacyEvidenceText && <section className="claim-detail-section"><h2>Previously submitted evidence</h2><p>{claim.legacyEvidenceText}</p></section>}
      <section className="claim-detail-section"><h2>Supporting files</h2>
        {claim.evidenceFiles?.length ? <ul className="evidence-download-list">{claim.evidenceFiles.map((file) => <li key={file.id}><span><strong>{file.originalFilename}</strong><small>{file.mimeType} · {(Number(file.fileSize) / (1024 * 1024)).toFixed(2)} MB</small></span><button className="button button-small" type="button" disabled={busy} onClick={() => handleDownload(file)}>Download securely</button></li>)}</ul> : <p>No uploaded files are associated with this claim.</p>}
      </section>
      {actionError && <p className="module-feedback module-feedback-error" role="alert">{actionError}</p>}
      {claim.status === 'PENDING' && <button className="button button-danger" type="button" disabled={busy} onClick={handleWithdraw}>{busy ? 'Please wait…' : 'Withdraw pending claim'}</button>}
    </article>}
  </section>;
}
