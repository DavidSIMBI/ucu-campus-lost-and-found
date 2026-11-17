import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) =>
    setForm({ ...form, [event.target.name]: event.target.value });

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      return setError('Enter a valid email address, for example name@example.com.');
    }
    if (!form.password) {
      return setError('Enter your password.');
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', {
        email: form.email.trim().toLowerCase(), password: form.password,
      });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.dispatchEvent(new Event('auth-change'));
      navigate('/');
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Could not reach the server. Check that the backend is running, then try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-panel">
        <p className="section-label">Welcome back</p>
        <h1>Log in</h1>
        <p className="page-intro">Log in to report items and follow your claims.</p>

        <form onSubmit={handleSubmit} noValidate>
          {error && <p className="form-error" role="alert">{error}</p>}

          <label>
            Email address
            <input type="email" name="email" autoComplete="email"
              placeholder="name@example.com" value={form.email} onChange={handleChange} />
          </label>

          <label>
            Password
            <input type="password" name="password" autoComplete="current-password"
              placeholder="Enter your password" value={form.password} onChange={handleChange} />
          </label>

          <button className="button" type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <p className="auth-switch">
          New to the service? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </section>
  );
}
