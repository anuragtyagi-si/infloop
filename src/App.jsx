import { createContext, useContext, useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { Menu, X, Rocket, House, Users, Target, FilePenLine, PanelTop, PanelTopOpen, LayoutDashboard, LogIn } from 'lucide-react';
import Logo, { LoopMark } from './components/Logo';
import Home from './pages/Home';
import Creators from './pages/Creators';
import Pricing from './pages/Pricing';
import Brief from './pages/Brief';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { AuthProvider, useAuth } from './api';
import { readStored, writeStored } from './lib';

const ShortlistContext = createContext();
export const useShortlist = () => useContext(ShortlistContext);

function focusContent(event) {
  event.preventDefault();
  const content = document.getElementById('main-content');
  content?.scrollIntoView({ block: 'start' });
  content?.focus({ preventScroll: true });
}

function ScrollToTop() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    const titles = { '/': 'Influence. In full loop.', '/creators': 'Find your people', '/pricing': 'Ambition, meet your plan', '/start': 'Start your next loop', '/login': 'Creator login', '/dashboard': 'Your campaigns' };
    document.title = `infloop — ${titles[location.pathname.replace(/\/$/, '') || '/'] || 'Page not found'}`;
  }, [location.pathname]);
  return null;
}

function Header() {
  const [open, setOpen] = useState(false);
  const { shortlist } = useShortlist();
  const { token } = useAuth();
  const location = useLocation();
  useEffect(() => { setOpen(false); }, [location]);
  useEffect(() => {
    const close = (event) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);
  return <header className="site-header">
    <div className="header-inner">
      <Link className="brand-link" to="/" aria-label="infloop home"><Logo /></Link>
      <nav className={open ? 'main-nav is-open' : 'main-nav'} aria-label="Main navigation" id="main-nav">
        <NavLink to="/" end><House size={16} aria-hidden="true"/>Home</NavLink>
        <NavLink to="/creators"><Users size={16} aria-hidden="true"/>Creators {shortlist.length > 0 && <span className="nav-count">{shortlist.length}</span>}</NavLink>
        <NavLink to="/pricing"><Target size={16} aria-hidden="true"/>Pricing</NavLink>
        {token ? <NavLink to="/dashboard"><LayoutDashboard size={16} aria-hidden="true"/>Dashboard</NavLink> : <NavLink to="/login"><LogIn size={16} aria-hidden="true"/>Creator login</NavLink>}
        <Link className="button button-dark mobile-cta" to="/start">Start a campaign <Rocket size={17} aria-hidden="true"/></Link>
      </nav>
      <Link className="button button-dark header-cta" to="/start">Start a campaign <Rocket size={17} aria-hidden="true"/></Link>
      <button className="icon-button menu-button" aria-expanded={open} aria-controls="main-nav" aria-label={open ? 'Close navigation' : 'Open navigation'} onClick={() => setOpen(!open)}>{open ? <X aria-hidden="true"/> : <Menu aria-hidden="true"/>}<span className="sr-only">{open ? 'Close navigation' : 'Open navigation'}</span></button>
    </div>
  </header>;
}

function Footer() {
  return <footer className="site-footer"><div className="container">
    <div className="footer-top"><div><Link to="/" aria-label="infloop home"><Logo /></Link><p>Good connections.<br/>Great things on repeat.</p></div><div className="footer-nav"><Link to="/creators">Find creators <Users size={16} aria-hidden="true"/></Link><Link to="/pricing">Explore pricing <Target size={16} aria-hidden="true"/></Link><Link to="/start">Build your brief <FilePenLine size={16} aria-hidden="true"/></Link></div><div className="footer-signoff"><LoopMark/><span>ONE SYSTEM.<br/>INFINITE POTENTIAL.</span></div></div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} infloop. All rights reserved.</span><span>Creators. Campaigns. Connected.</span><a href="#main-content" onClick={focusContent}>Back to top <PanelTopOpen size={14} aria-hidden="true"/></a></div>
  </div></footer>;
}

export default function App() {
  const [shortlist, setShortlist] = useState(() => {
    const saved = readStored('infloop-shortlist', []);
    return Array.isArray(saved) ? saved.filter(id => typeof id === 'string') : [];
  });
  useEffect(() => { writeStored('infloop-shortlist', shortlist); }, [shortlist]);
  const toggle = id => setShortlist(previous => previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id]);
  return <AuthProvider><ShortlistContext.Provider value={{ shortlist, toggle }}>
    <ScrollToTop/>
    <a className="skip-link" href="#main-content" onClick={focusContent}><PanelTop size={16} aria-hidden="true"/>Skip to content</a>
    <Header/>
    <main id="main-content" tabIndex={-1}><Routes><Route path="/" element={<Home/>}/><Route path="/creators" element={<Creators/>}/><Route path="/pricing" element={<Pricing/>}/><Route path="/start" element={<Brief/>}/><Route path="/login" element={<Login/>}/><Route path="/dashboard" element={<Dashboard/>}/><Route path="*" element={<section className="container empty-state"><span className="eyebrow">OFF THE CIRCUIT</span><h1>Let’s get you<br/>back in the loop.</h1><Link className="button button-dark" to="/">Back to home <House size={17} aria-hidden="true"/></Link></section>}/></Routes></main>
    <Footer/>
  </ShortlistContext.Provider></AuthProvider>;
}
