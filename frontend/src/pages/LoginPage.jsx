
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Login failed. Please try again.'
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
        <p className="page-intro">
          Sign in to access the UCU Campus Lost and Found platform.
        </p>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="name@example.com"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="Enter your password"
              required
            />
          </label>

          <button
            className="button"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <p className="auth-switch">
          New to the service?{' '}
          <Link to="/register">Create an account</Link>
        </p>
      </div>
    </section>
  );
}
