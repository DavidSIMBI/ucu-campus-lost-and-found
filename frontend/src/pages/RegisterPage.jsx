import { Link } from 'react-router-dom';

export default function RegisterPage() {
  return <section className="auth-page"><div className="auth-panel"><p className="section-label">For UCU students and staff</p><h1>Create account</h1><p className="page-intro">Registration is a visual placeholder; account creation is not connected yet.</p><form onSubmit={(event) => event.preventDefault()}><label>Full name<input type="text" autoComplete="name" placeholder="Your name" /></label><label>UCU email address<input type="email" autoComplete="email" placeholder="name@ucu.ac.ug" /></label><label>Password<input type="password" autoComplete="new-password" placeholder="Create a password" /></label><button className="button" type="submit" disabled>Create account (coming soon)</button></form><p className="auth-switch">Already registered? <Link to="/login">Log in</Link></p></div></section>;
}
