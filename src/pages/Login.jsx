import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { LogIn, MailCheck, ShieldCheck, UserPlus } from 'lucide-react';
import { API_URL, apiRequest, useAuth } from '../api';
import { LoopMark } from '../components/Logo';

export default function Login() {
  const [params, setParams] = useSearchParams();
  const signup = params.get('mode') === 'signup';
  const { user, login } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  const [busy, setBusy] = useState(false);
  // Email of an account that still has to be verified, after sign-up or a refused login.
  const [pending, setPending] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [resent, setResent] = useState('');

  if (user) return <Navigate to="/dashboard" replace/>;

  const update = (key, value) => { setForm(f => ({ ...f, [key]: value })); setError(''); setPending(''); setFields(f => ({ ...f, [key]: undefined })); };
  const switchMode = next => { setParams(next ? { mode: 'signup' } : {}, { replace: true }); setError(''); setFields({}); setPending(''); setSentTo(''); setResent(''); };
  const submit = async event => {
    event.preventDefault();
    setBusy(true); setError(''); setFields({});
    try {
      if (signup) {
        const data = await apiRequest('/auth/signup', { method: 'POST', body: form });
        setResent(''); setSentTo(data.email);
      } else {
        await login({ email: form.email, password: form.password });
      }
    } catch (failure) {
      setError(failure.message); setFields(failure.fields || {});
      if (failure.code === 'email_not_verified') { setPending(form.email); setResent(''); }
    } finally {
      setBusy(false);
    }
  };
  const resend = async email => {
    setBusy(true); setError(''); setResent('');
    try {
      await apiRequest('/auth/resend-verification', { method: 'POST', body: { email } });
      setResent(`We sent a new link to ${email}. Earlier links no longer work.`);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  };

  return <section className="container auth-page">
    <div className="auth-intro">
      <span className="eyebrow"><span className="live-dot"/> FOR CREATORS</span>
      <h1>{signup ? <>Join the<br/><span className="serif-word">loop.</span></> : <>Welcome<br/><span className="serif-word">back.</span></>}</h1>
      <p>{signup ? 'Create your creator account to see the campaigns you’re part of.' : 'Log in to see your campaigns, deliverables, and dates in one place.'}</p>
      <span className="brief-heading-note"><ShieldCheck size={17} aria-hidden="true"/> Your password is stored as a one-way hash.<br/>We never see or send it.</span>
    </div>
    <div className="brief-main auth-card">
      <div className="auth-tabs" role="group" aria-label="Choose log in or sign up">
        <button type="button" className={signup ? '' : 'active'} aria-pressed={!signup} onClick={() => switchMode(false)}><LogIn size={14} aria-hidden="true"/>Log in</button>
        <button type="button" className={signup ? 'active' : ''} aria-pressed={signup} onClick={() => switchMode(true)}><UserPlus size={14} aria-hidden="true"/>Sign up</button>
      </div>
      {sentTo ? <div className="brief-form verify-state">
        <div className="form-section-heading"><span className="mini-label">ONE MORE STEP</span><h2>Check your email to verify.</h2></div>
        <p className="verify-copy"><MailCheck size={18} aria-hidden="true"/><span>We sent a verification link to <strong>{sentTo}</strong>. Open it within 24 hours to activate your account, then log in.</span></p>
        {resent && <p className="form-note" role="status">{resent}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-actions">
          <button type="button" className="text-link" disabled={busy} onClick={() => resend(sentTo)}>{busy ? 'Sending…' : 'Resend the email'}</button>
          <button type="button" className="button button-dark" onClick={() => switchMode(false)}>Go to log in<LogIn size={17} aria-hidden="true"/></button>
        </div>
      </div> : <form className="brief-form" onSubmit={submit}>
        <div className="form-section-heading"><span className="mini-label">{signup ? 'NEW HERE' : 'CREATOR LOGIN'}</span><h2>{signup ? 'Create your account.' : 'Log in to your dashboard.'}</h2></div>
        {!API_URL && <p className="form-error" role="alert">The infloop API is not connected to this site yet, so accounts are unavailable.</p>}
        {signup && <label className="field">Your name<input name="name" required maxLength={100} autoComplete="name" value={form.name} onChange={e => update('name', e.target.value)} aria-invalid={Boolean(fields.name)} placeholder="Maya Chen"/>{fields.name && <small className="field-error">{fields.name}</small>}</label>}
        <label className="field">Email<input name="email" type="email" required maxLength={254} autoComplete="email" value={form.email} onChange={e => update('email', e.target.value)} aria-invalid={Boolean(fields.email)} placeholder="you@example.com"/>{fields.email && <small className="field-error">{fields.email}</small>}</label>
        <label className="field">Password<input name="password" type="password" required minLength={signup ? 8 : undefined} maxLength={72} autoComplete={signup ? 'new-password' : 'current-password'} value={form.password} onChange={e => update('password', e.target.value)} aria-invalid={Boolean(fields.password)} placeholder={signup ? 'At least 8 characters' : 'Your password'}/>{fields.password && <small className="field-error">{fields.password}</small>}</label>
        {error && <p className="form-error" role="alert">{error}</p>}
        {resent && <p className="form-note" role="status">{resent}</p>}
        {pending && !resent && <button type="button" className="text-link verify-resend" disabled={busy} onClick={() => resend(pending)}>Resend verification email</button>}
        <div className="form-actions">
          <button type="button" className="text-link" onClick={() => switchMode(!signup)}>{signup ? 'I already have an account' : 'Create an account'}</button>
          <button type="submit" className="button button-dark" disabled={busy || !API_URL}>{busy ? 'One moment…' : signup ? 'Create account' : 'Log in'}{signup ? <UserPlus size={17} aria-hidden="true"/> : <LogIn size={17} aria-hidden="true"/>}</button>
        </div>
      </form>}
      <div className="draft-status"><span><LoopMark className="auth-mark"/> Creator accounts only, for now</span></div>
    </div>
  </section>;
}
