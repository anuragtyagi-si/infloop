import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { LogIn, ShieldCheck, UserPlus } from 'lucide-react';
import { API_URL, useAuth } from '../api';
import { LoopMark } from '../components/Logo';

export default function Login() {
  const [params, setParams] = useSearchParams();
  const signup = params.get('mode') === 'signup';
  const { user, authenticate } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/dashboard" replace/>;

  const update = (key, value) => { setForm(f => ({ ...f, [key]: value })); setError(''); setFields(f => ({ ...f, [key]: undefined })); };
  const switchMode = next => { setParams(next ? { mode: 'signup' } : {}, { replace: true }); setError(''); setFields({}); };
  const submit = async event => {
    event.preventDefault();
    setBusy(true); setError(''); setFields({});
    try {
      await authenticate(signup ? 'signup' : 'login', signup ? form : { email: form.email, password: form.password });
    } catch (failure) {
      setError(failure.message); setFields(failure.fields || {});
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
      <form className="brief-form" onSubmit={submit}>
        <div className="form-section-heading"><span className="mini-label">{signup ? 'NEW HERE' : 'CREATOR LOGIN'}</span><h2>{signup ? 'Create your account.' : 'Log in to your dashboard.'}</h2></div>
        {!API_URL && <p className="form-error" role="alert">The infloop API is not connected to this site yet, so accounts are unavailable.</p>}
        {signup && <label className="field">Your name<input name="name" required maxLength={100} autoComplete="name" value={form.name} onChange={e => update('name', e.target.value)} aria-invalid={Boolean(fields.name)} placeholder="Maya Chen"/>{fields.name && <small className="field-error">{fields.name}</small>}</label>}
        <label className="field">Email<input name="email" type="email" required maxLength={254} autoComplete="email" value={form.email} onChange={e => update('email', e.target.value)} aria-invalid={Boolean(fields.email)} placeholder="you@example.com"/>{fields.email && <small className="field-error">{fields.email}</small>}</label>
        <label className="field">Password<input name="password" type="password" required minLength={signup ? 8 : undefined} maxLength={72} autoComplete={signup ? 'new-password' : 'current-password'} value={form.password} onChange={e => update('password', e.target.value)} aria-invalid={Boolean(fields.password)} placeholder={signup ? 'At least 8 characters' : 'Your password'}/>{fields.password && <small className="field-error">{fields.password}</small>}</label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-actions">
          <button type="button" className="text-link" onClick={() => switchMode(!signup)}>{signup ? 'I already have an account' : 'Create an account'}</button>
          <button type="submit" className="button button-dark" disabled={busy || !API_URL}>{busy ? 'One moment…' : signup ? 'Create account' : 'Log in'}{signup ? <UserPlus size={17} aria-hidden="true"/> : <LogIn size={17} aria-hidden="true"/>}</button>
        </div>
      </form>
      <div className="draft-status"><span><LoopMark className="auth-mark"/> Creator accounts only, for now</span></div>
    </div>
  </section>;
}
