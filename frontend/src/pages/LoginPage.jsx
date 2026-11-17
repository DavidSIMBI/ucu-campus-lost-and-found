import { Link } from 'react-router-dom';

export default function LoginPage() {
  return <section className="auth-page"><div className="auth-panel"><p className="section-label">Welcome back</p><h1>Log in</h1><p className="page-intro">Account access will be connected when authentication is implemented.</p><form onSubmit={(event) => event.preventDefault()}><label>Email address<input type="email" autoComplete="email" placeholder="name@example.com" /></label><label>Password<input type="password" autoComplete="current-password" placeholder="Enter your password" /></label><button className="button" type="submit" disabled>Log in (coming soon)</button></form><p className="auth-switch">New to the service? <Link to="/register">Create an account</Link></p></div></section>;
}
