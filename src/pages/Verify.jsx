import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LogIn, MailCheck, MailWarning } from 'lucide-react';
import { apiRequest } from '../api';
import { LoopMark } from '../components/Logo';

// Landing page for the link in the verification email: /verify?token=…
// The link alone does not activate the account; the sign-up password is asked for too.
export default function Verify() {
  const token = useSearchParams()[0].get('token') || '';
  const [state, setState] = useState({ status: token ? 'ready' : 'failed', message: token ? '' : 'This verification link is incomplete. Request a new one below.' });
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState({ busy: false, error: '' });
  const [email, setEmail] = useState('');
  const [resend, setResend] = useState({ busy: false, note: '', error: '' });

  const verify = async event => {
    event.preventDefault();
    setVerifying({ busy: true, error: '' });
    try {
      const data = await apiRequest('/auth/verify', { method: 'POST', body: { token, password } });
      setState({ status: 'verified', message: data.email });
    } catch (failure) {
      // A wrong password keeps the link usable; anything else about the link does not.
      if (failure.code === 'invalid_verification_token') setState({ status: 'failed', message: failure.message });
      else setVerifying({ busy: false, error: failure.fields?.password || failure.message });
    }
  };

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
        {state.status === 'ready' && <form onSubmit={verify}>
          <div className="form-section-heading"><span className="mini-label">ONE MORE STEP</span><h2>Confirm it’s you.</h2></div>
          <p className="verify-copy"><MailCheck size={18} aria-hidden="true"/><span>Enter the password you chose when signing up to verify your email and activate your account.</span></p>
          <label className="field">Password<input name="password" type="password" required autoFocus autoComplete="current-password" value={password} onChange={e => { setPassword(e.target.value); setVerifying(v => ({ ...v, error: '' })); }}/></label>
          {verifying.error && <p className="form-error" role="alert">{verifying.error}</p>}
          <div className="form-actions">
            <Link className="text-link" to="/login?mode=signup">Sign up again</Link>
            <button type="submit" className="button button-dark" disabled={verifying.busy}>{verifying.busy ? 'Verifying…' : 'Verify email'}</button>
          </div>
        </form>}
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
