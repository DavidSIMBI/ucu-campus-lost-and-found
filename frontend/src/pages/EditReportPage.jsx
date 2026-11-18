import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api.js';

function getDateInputValue(value) {
  if (!value) return '';

  const dateText = String(value);
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(dateText);
  return match ? match[1] : '';
}

export default function EditReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    reportType: '',
    title: '',
    description: '',
    category: '',
    location: '',
    eventDate: '',
    identifyingDetails: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadReport() {
      setLoading(true);
      setError('');
      setForm({
        reportType: '',
        title: '',
        description: '',
        category: '',
        location: '',
        eventDate: '',
        identifyingDetails: ''
      });

      try {
        const response = await api.get(`/reports/${id}/edit`, {
          signal: controller.signal
        });
        const report = response.data?.report;

        if (!report || typeof report !== 'object') {
          throw new Error('The report response was not in the expected format.');
        }

        setForm({
          reportType: String(report.report_type || '').toUpperCase(),
          title: report.title || '',
          description: report.description || '',
          category: report.category || '',
          location: report.location || '',
          eventDate: getDateInputValue(report.event_date),
          identifyingDetails: report.identifying_details || ''
        });
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(
            requestError.response?.data?.message ||
            requestError.message ||
            'Unable to load this report. Please try again.'
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadReport();
    return () => controller.abort();
  }, [id]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    const reportData = {
      title: form.title,
      description: form.description,
      category: form.category,
      location: form.location,
      eventDate: form.eventDate
    };

    if (form.reportType === 'FOUND') {
      reportData.identifyingDetails = form.identifyingDetails;
    }

    try {
      const response = await api.put(`/reports/${id}`, reportData);
      setSuccess(response.data?.message || 'Report updated successfully.');
      window.setTimeout(() => navigate('/my-reports'), 800);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
        'Unable to save your changes. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="browse-page section-shell report-page edit-report-page">
      <p className="section-label">Update your report</p>
      <h1>Edit report</h1>
      <p className="page-intro">
        Update the details so others have the clearest information about this item.
      </p>

      {loading && (
        <p className="edit-report-state" role="status">Loading report…</p>
      )}

      {!loading && error && !form.title && (
        <div className="report-feedback report-error" role="alert">
          <p>{error}</p>
          <Link className="button button-small" to="/my-reports">Back to My Reports</Link>
        </div>
      )}

      {!loading && form.title && (
        <form className="report-form" onSubmit={handleSubmit}>
          <div className="report-field edit-report-type">
            <span className="edit-report-type-label">Report type</span>
            <strong>{form.reportType === 'FOUND' ? 'Found item' : 'Lost item'}</strong>
            <small>Report type cannot be changed after creation.</small>
          </div>

          <div className="report-field">
            <label htmlFor="title">Item name</label>
            <input
              id="title"
              name="title"
              value={form.title}
              onChange={handleChange}
              maxLength="140"
              required
            />
          </div>

          <div className="report-field report-field-wide">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              maxLength="65535"
              rows="4"
              required
            />
          </div>

          <div className="report-field">
            <label htmlFor="category">Category</label>
            <input
              id="category"
              name="category"
              value={form.category}
              onChange={handleChange}
              maxLength="60"
              required
            />
          </div>

          <div className="report-field">
            <label htmlFor="location">Location</label>
            <input
              id="location"
              name="location"
              value={form.location}
              onChange={handleChange}
              maxLength="160"
              required
            />
          </div>

          <div className="report-field">
            <label htmlFor="eventDate">Date lost or found</label>
            <input
              id="eventDate"
              name="eventDate"
              type="date"
              value={form.eventDate}
              onChange={handleChange}
              required
            />
          </div>

          {form.reportType === 'FOUND' && (
            <div className="report-field report-field-wide">
              <label htmlFor="identifyingDetails">Private identifying details</label>
              <textarea
                id="identifyingDetails"
                name="identifyingDetails"
                value={form.identifyingDetails}
                onChange={handleChange}
                maxLength="65535"
                rows="4"
                required
              />
              <small>These details are visible only to you and are not shown in public listings.</small>
            </div>
          )}

          {error && <p className="report-feedback report-error" role="alert">{error}</p>}
          {success && <p className="report-feedback report-success" role="status">{success}</p>}

          <div className="edit-report-actions">
            <button className="button report-submit" type="submit" disabled={saving || Boolean(success)}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              className="edit-report-cancel"
              type="button"
              onClick={() => navigate('/my-reports')}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
