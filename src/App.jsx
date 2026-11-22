import { createContext, useContext, useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { ArrowUpRight, Menu, X, Bookmark, ArrowRight } from 'lucide-react';
import Logo, { LoopMark } from './components/Logo';
import Home from './pages/Home';
import Creators from './pages/Creators';
import Pricing from './pages/Pricing';
import Brief from './pages/Brief';
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
    const titles = { '/': 'Influence. In full loop.', '/creators': 'Find your people', '/pricing': 'Ambition, meet your plan', '/start': 'Start your next loop' };
    document.title = `infloop — ${titles[location.pathname] || 'Page not found'}`;
  }, [location.pathname]);
  return null;
}

function Header() {
  const [open, setOpen] = useState(false);
  const { shortlist } = useShortlist();
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
        <NavLink to="/" end>Home</NavLink>
        <NavLink to="/creators">Creators {shortlist.length > 0 && <span className="nav-count">{shortlist.length}</span>}</NavLink>
        <NavLink to="/pricing">Pricing</NavLink>
        <Link className="button button-dark mobile-cta" to="/start">Start a campaign <ArrowUpRight size={17}/></Link>
      </nav>
      <Link className="button button-dark header-cta" to="/start">Start a campaign <ArrowUpRight size={17}/></Link>
      <button className="icon-button menu-button" aria-expanded={open} aria-controls="main-nav" aria-label={open ? 'Close navigation' : 'Open navigation'} onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button>
    </div>
  </header>;
}

function Footer() {
  return <footer className="site-footer"><div className="container">
    <div className="footer-top"><div><Link to="/" aria-label="infloop home"><Logo /></Link><p>Good connections.<br/>Great things on repeat.</p></div><div className="footer-nav"><Link to="/creators">Find creators <ArrowUpRight size={15}/></Link><Link to="/pricing">Explore pricing <ArrowUpRight size={15}/></Link><Link to="/start">Build your brief <ArrowUpRight size={15}/></Link></div><div className="footer-signoff"><LoopMark/><span>ONE SYSTEM.<br/>INFINITE POTENTIAL.</span></div></div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} infloop. All rights reserved.</span><span>Creators. Campaigns. Connected.</span><a href="#main-content" onClick={focusContent}>Back to top ↑</a></div>
  </div></footer>;
}

export default function App() {
  const [shortlist, setShortlist] = useState(() => {
    const saved = readStored('infloop-shortlist', []);
    return Array.isArray(saved) ? saved.filter(id => typeof id === 'string') : [];
  });
  useEffect(() => { writeStored('infloop-shortlist', shortlist); }, [shortlist]);
  const toggle = id => setShortlist(previous => previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id]);
  return <ShortlistContext.Provider value={{ shortlist, toggle }}>
    <ScrollToTop/>
    <a className="skip-link" href="#main-content" onClick={focusContent}>Skip to content</a>
    <Header/>
    <main id="main-content" tabIndex={-1}><Routes><Route path="/" element={<Home/>}/><Route path="/creators" element={<Creators/>}/><Route path="/pricing" element={<Pricing/>}/><Route path="/start" element={<Brief/>}/><Route path="*" element={<section className="container empty-state"><span className="eyebrow">OFF THE CIRCUIT</span><h1>Let’s get you<br/>back in the loop.</h1><Link className="button button-dark" to="/">Back to home <ArrowRight size={17}/></Link></section>}/></Routes></main>
    <Footer/>
  </ShortlistContext.Provider>;
}
