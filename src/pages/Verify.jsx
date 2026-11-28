import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LogIn, MailCheck, MailWarning } from 'lucide-react';
import { apiRequest } from '../api';
import { LoopMark } from '../components/Logo';

// Landing page for the link in the verification email: /verify?token=…
export default function Verify() {
  const token = useSearchParams()[0].get('token') || '';
  const [state, setState] = useState({ status: token ? 'checking' : 'failed', message: token ? '' : 'This verification link is incomplete. Request a new one below.' });
  const [email, setEmail] = useState('');
  const [resend, setResend] = useState({ busy: false, note: '', error: '' });
  // The link is single-use, so the request must go out once even when effects re-run.
  const request = useRef(null);

  useEffect(() => {
    if (!token) return;
    request.current ||= apiRequest('/auth/verify', { method: 'POST', body: { token } });
    request.current
      .then(data => setState({ status: 'verified', message: data.email }))
      .catch(failure => setState({ status: 'failed', message: failure.message }));
  }, [token]);

  const submit = async event => {
    event.preventDefault();
    setResend({ busy: true, note: '', error: '' });
    try {
      const data = await apiRequest('/auth/resend-verification', { method: 'POST', body: { email } });
      setResend({ busy: false, note: data.message, error: '' });
    } catch (failure) {
      setResend({ busy: false, note: '', error: failure.fields?.email || failure.message });
    }
  };

  return <section className="container auth-page">
    <div className="auth-intro">
      <span className="eyebrow"><span className="live-dot"/> FOR CREATORS</span>
      <h1>Confirm your<br/><span className="serif-word">email.</span></h1>
      <p>Verifying your address activates your creator account, so only you can use it.</p>
    </div>
    <div className="brief-main auth-card">
      <div className="brief-form verify-state" aria-live="polite">
        {state.status === 'checking' && <div className="form-section-heading"><span className="mini-label">ONE MOMENT</span><h2>Verifying your email…</h2></div>}
        {state.status === 'verified' && <>
          <div className="form-section-heading"><span className="mini-label">ALL SET</span><h2>Your email is verified.</h2></div>
          <p className="verify-copy"><MailCheck size={18} aria-hidden="true"/><span><strong>{state.message}</strong> is confirmed and your account is active. Log in to see your campaigns.</span></p>
          <div className="form-actions"><span/><Link className="button button-dark" to="/login">Log in<LogIn size={17} aria-hidden="true"/></Link></div>
        </>}
        {state.status === 'failed' && <form onSubmit={submit}>
          <div className="form-section-heading"><span className="mini-label">LINK NOT ACCEPTED</span><h2>We couldn’t verify your email.</h2></div>
          <p className="verify-copy"><MailWarning size={18} aria-hidden="true"/><span>{state.message}</span></p>
          <label className="field">Email<input name="email" type="email" required maxLength={254} autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"/></label>
          {resend.note && <p className="form-note" role="status">{resend.note}</p>}
          {resend.error && <p className="form-error" role="alert">{resend.error}</p>}
          <div className="form-actions">
            <Link className="text-link" to="/login">Back to log in</Link>
            <button type="submit" className="button button-dark" disabled={resend.busy}>{resend.busy ? 'Sending…' : 'Send a new link'}</button>
          </div>
        </form>}
      </div>
      <div className="draft-status"><span><LoopMark className="auth-mark"/> Creator accounts only, for now</span></div>
    </div>
  </section>;
}
