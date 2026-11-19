import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ClaimError, ClaimLoading } from '../components/ClaimState.jsx';
import { getFoundItem } from '../services/foundItemsService.js';
import { submitClaim } from '../services/claimsService.js';

const MAX_FILES = 5;
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'pdf']);

export default function ClaimSubmissionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(true);
  const [justification, setJustification] = useState('');
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    getFoundItem(id, { signal: controller.signal })
      .then((item) => {
        if (item?.report_type !== 'FOUND' || item.status !== 'OPEN') throw new Error('This found item is not accepting claims.');
        setReport(item);
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(requestError.response?.data?.message || requestError.message || 'Unable to load this item.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoadingReport(false); });
    return () => controller.abort();
  }, [id]);

  const previews = useMemo(() => files.map((file) => ({
    file,
    url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
  })), [files]);

  useEffect(() => () => previews.forEach(({ url }) => { if (url) URL.revokeObjectURL(url); }), [previews]);

  function handleFiles(event) {
    const incoming = Array.from(event.target.files || []);
    event.target.value = '';
    setError('');
    if (files.length + incoming.length > MAX_FILES) {
      setError('You can attach up to 5 files.');
      return;
    }
    const invalid = incoming.find((file) => {
      const extension = file.name.split('.').pop().toLowerCase();
      return !ACCEPTED_EXTENSIONS.has(extension) || file.size < 1 || file.size > MAX_BYTES;
    });
    if (invalid) {
      setError('Choose JPG, JPEG, PNG, or PDF files no larger than 5 MB each.');
      return;
    }
    setFiles((current) => [...current, ...incoming]);
  }

  function removeFile(index) {
    setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (justification.trim().length < 10) {
      setError('Please provide a justification with at least 10 characters.');
      return;
    }
    if (files.length < 1) {
      setError('Attach at least one supporting file.');
      return;
    }

    setSubmitting(true);
    setProgress(0);
    try {
      const result = await submitClaim({
        reportId: report.id,
        justification,
        files,
        onUploadProgress: (event) => {
          if (event.total) setProgress(Math.round((event.loaded / event.total) * 100));
        }
      });
      navigate(result.claim?.id ? `/my-claims/${result.claim.id}` : '/my-claims', {
        replace: true,
        state: { notice: 'Your claim was submitted successfully.' }
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to submit your claim. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return <section className="module-page section-shell">
    <Link className="text-link" to={`/found-items/${id}`}>← Back to item</Link>
    {loadingReport && <ClaimLoading>Loading item details…</ClaimLoading>}
    {!loadingReport && error && !report && <ClaimError message={error} />}
    {!loadingReport && report && <>
      <header className="module-heading"><div><p className="section-label">Claim found property</p><h1>Submit a claim</h1>
        <p className="page-intro">Tell us why this item belongs to you. Your information and files are shared only with administrators reviewing the claim.</p></div></header>

      <div className="claim-form-layout">
        <aside className="module-panel selected-item-panel"><p className="section-label">Selected item</p><h2>{report.title}</h2>
          <p>{report.description}</p><dl><div><dt>Category</dt><dd>{report.category}</dd></div><div><dt>Location found</dt><dd>{report.location}</dd></div></dl>
        </aside>

        <form className="module-panel claim-form" onSubmit={handleSubmit}>
          <label className="module-field" htmlFor="claim-justification">Why is this item yours?<textarea id="claim-justification" value={justification} onChange={(event) => setJustification(event.target.value)} minLength={10} maxLength={65535} rows={6} required placeholder="Describe identifying details, marks, contents, or other information that is not visible in the listing." /></label>
          <div className="module-field"><label htmlFor="claim-evidence">Supporting evidence</label>
            <p className="field-help">Upload 1–5 photographs or PDF documents. Maximum 5 MB per file.</p>
            <input id="claim-evidence" type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" multiple onChange={handleFiles} />
          </div>

          {previews.length > 0 && <ul className="evidence-preview-list" aria-label="Selected evidence files">
            {previews.map(({ file, url }, index) => <li className="evidence-preview" key={`${file.name}-${file.lastModified}-${index}`}>
              {url ? <img src={url} alt={`Preview of ${file.name}`} /> : <span className="evidence-file-icon" aria-hidden="true">PDF</span>}
              <span className="evidence-file-info"><strong>{file.name}</strong><small>{(file.size / (1024 * 1024)).toFixed(2)} MB</small></span>
              <button className="text-button" type="button" onClick={() => removeFile(index)} aria-label={`Remove ${file.name}`}>Remove</button>
            </li>)}
          </ul>}

          {error && <p className="module-feedback module-feedback-error" role="alert">{error}</p>}
          {submitting && <div className="upload-progress" role="status"><span>Uploading evidence {progress ?? 0}%</span><progress max="100" value={progress ?? 0} /></div>}
          <button className="button" type="submit" disabled={submitting}>{submitting ? 'Submitting claim…' : 'Submit claim'}</button>
        </form>
      </div>
    </>}
  </section>;
}
