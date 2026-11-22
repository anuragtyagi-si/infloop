export function LoopMark({ className = '' }) {
  return <svg className={className} viewBox="0 0 64 48" fill="none" aria-hidden="true"><path d="M32 15 22 8a12 12 0 1 0 0 25L42 15a12 12 0 1 1 0 25L32 33" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default function Logo() {
  return <span className="logo"><LoopMark /><span>infloop<span className="logo-period">®</span></span></span>;
}
