import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';

const emptyForm = { fullName: '', email: '', password: '' };

export default function RegisterPage() {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
    setError('');
    setSuccess('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const { data } = await api.post('/auth/register', form);
      setSuccess(data.message);
      setForm(emptyForm);
    } catch (requestError) {
      if (requestError.response?.data?.message) {
        setError(requestError.response.data.message);
      } else if (requestError.code === 'ECONNABORTED') {
        setError('The account service is taking too long to respond. Start the backend and check that MySQL is available.');
      } else {
        setError('Cannot reach the account service. Start the backend with npm run dev, then try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-panel">
        <p className="section-label">For UCU students and staff</p>
        <h1>Create account</h1>
        <p className="page-intro">Join the UCU community and help lost belongings find their way home.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="register-name">
            Full name
            <input
              id="register-name"
              name="fullName"
              type="text"
              autoComplete="name"
              placeholder="Your name"
              minLength={2}
              maxLength={120}
              value={form.fullName}
              onChange={updateField}
              required
            />
          </label>
          <label htmlFor="register-email">
            UCU email address
            <input
              id="register-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="name@ucu.ac.ug"
              maxLength={254}
              value={form.email}
              onChange={updateField}
              required
            />
          </label>
          <label htmlFor="register-password">
            Password
            <input
              id="register-password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              minLength={8}
              maxLength={128}
              value={form.password}
              onChange={updateField}
              required
            />
          </label>
          {error && <p className="form-message form-error" role="alert">{error}</p>}
          {success && <p className="form-message form-success" role="status">{success}</p>}
          <button className="button" type="submit" disabled={isSubmitting || Boolean(success)}>
            {isSubmitting ? 'Creating account…' : success ? 'Account created' : 'Create account'}
          </button>
        </form>
        <p className="auth-switch">Already registered? <Link to="/login">Log in</Link></p>
      </div>
    </section>
  );
}
