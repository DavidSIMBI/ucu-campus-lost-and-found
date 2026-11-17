import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (form.fullName.trim().length < 2) return setError('Enter your full name.');
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setError('Enter a valid email address.');
    if (form.password.length < 8) return setError('Use a password with at least 8 characters.');

    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        ...form, fullName: form.fullName.trim(), email: form.email.trim().toLowerCase(),
      });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.dispatchEvent(new Event('auth-change'));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reach the server. Check that the backend is running, then try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-panel">
        <p className="section-label">For UCU students and staff</p>
        <h1>Create account</h1>
        <p className="page-intro">Create an account to report lost or found items and follow your claims.</p>
        <form onSubmit={handleSubmit} noValidate>
          {error && <p className="form-error" role="alert">{error}</p>}
          <label>Full name<input name="fullName" type="text" autoComplete="name" placeholder="Your name" value={form.fullName} onChange={handleChange} /></label>
          <label>Email address<input name="email" type="email" autoComplete="email" placeholder="name@ucu.ac.ug" value={form.email} onChange={handleChange} /></label>
          <label>Password<input name="password" type="password" autoComplete="new-password" placeholder="At least 8 characters" value={form.password} onChange={handleChange} /></label>
          <button className="button" type="submit" disabled={loading}>{loading ? 'Creating account...' : 'Create account'}</button>
        </form>
        <p className="auth-switch">Already registered? <Link to="/login">Log in</Link></p>
      </div>
    </section>
  );
}
