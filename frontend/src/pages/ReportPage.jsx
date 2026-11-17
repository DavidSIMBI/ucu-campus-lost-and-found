
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';

export default function ReportPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    reportType: 'LOST',
    title: '',
    description: '',
    category: 'Electronics',
    location: '',
    eventDate: '',
    identifyingDetails: ''
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await api.post('/reports', form);

      setSuccess(response.data.message);

      setTimeout(() => {
        navigate('/items');
      }, 1500);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to submit your report. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="browse-page section-shell">
      <p className="section-label">Help reunite an item with its owner</p>
      <h1>Report an item</h1>

      <p className="page-intro">
        Provide accurate information about the item you lost or found
        within the UCU community.
      </p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label htmlFor="reportType">Report type</label>
        <select
          id="reportType"
          name="reportType"
          value={form.reportType}
          onChange={handleChange}
          required
        >
          <option value="LOST">I lost an item</option>
          <option value="FOUND">I found an item</option>
        </select>

        <label htmlFor="title">Item name</label>
        <input
          id="title"
          name="title"
          value={form.title}
          onChange={handleChange}
          placeholder="e.g. Black Samsung phone"
          maxLength="140"
          required
        />

        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Describe the item..."
          rows="4"
          required
        />

        <label htmlFor="category">Category</label>
        <select
          id="category"
          name="category"
          value={form.category}
          onChange={handleChange}
          required
        >
          <option>Electronics</option>
          <option>Accessories</option>
          <option>Books</option>
          <option>Clothing</option>
          <option>Documents</option>
          <option>Other</option>
        </select>

        <label htmlFor="location">Location</label>
        <input
          id="location"
          name="location"
          value={form.location}
          onChange={handleChange}
          placeholder="e.g. Main Library"
          required
        />

        <label htmlFor="eventDate">Date lost or found</label>
        <input
          id="eventDate"
          name="eventDate"
          type="date"
          value={form.eventDate}
          onChange={handleChange}
          required
        />

        <label htmlFor="identifyingDetails">
          Private identifying details
        </label>
        <textarea
          id="identifyingDetails"
          name="identifyingDetails"
          value={form.identifyingDetails}
          onChange={handleChange}
          placeholder="Enter details that can help verify the real owner. These will not appear in public listings."
          rows="4"
          required
        />

        {error && <p className="error-message">{error}</p>}
        {success && <p className="success-message">{success}</p>}

        <button
          className="button"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Submitting...' : 'Submit report'}
        </button>
      </form>
    </section>
  );
}
