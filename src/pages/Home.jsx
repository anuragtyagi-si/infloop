import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Pause, Search, FileText, Rocket, ChartNoAxesCombined, MousePointer2, Check, CirclePlus, CircleMinus, Compass, Users, Target, UserRound } from 'lucide-react';
import { LoopMark } from '../components/Logo';
import { stages, creators } from '../data';
const Track = lazy(() => import('../components/Track'));
const icons = [Search, FileText, Rocket, ChartNoAxesCombined];

function Counter({ value, suffix = '' }) {
  const [number, setNumber] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setNumber(value);
      return;
    }
    let frame;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      const start = performance.now();
      const animate = now => {
        const t = Math.min(1, (now - start) / 1300);
        setNumber(Math.round(value * (1 - Math.pow(1-t, 3))));
        if (t < 1) frame = requestAnimationFrame(animate);
      };
      frame = requestAnimationFrame(animate);observer.disconnect();
    });
    observer.observe(ref.current);
    return () => { observer.disconnect();cancelAnimationFrame(frame); };
  }, [value]);
  return <span ref={ref}>{number}{suffix}</span>;
}

export function CampaignCTA() {
  return <section className="cta-section container"><div className="cta-box"><div className="cta-orbit" aria-hidden="true"><LoopMark/></div><div><span className="eyebrow">YOUR NEXT BIG THING STARTS HERE</span><h2>Let’s make<br/>some momentum.</h2><p>The right creators. A smarter campaign. One connected loop.</p><Link className="button button-lime" to="/start">Start a campaign <Rocket size={18} aria-hidden="true"/></Link></div><span className="cta-small">FROM FIRST HELLO<br/>TO WHAT’S NEXT. ↗</span></div></section>;
}

export default function Home() {
  const [stage, setStage] = useState(0);
  const [paused, setPaused] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [laps, setLaps] = useState(1);
  const [jump, setJump] = useState(null);
  const [ready, setReady] = useState(null);
  const [faq, setFaq] = useState(null);
  const selectStage = index => { setStage(index);setJump({ stage:index, time:Date.now() }); };
  return <>
    <section className="hero container">
      <div className="hero-kicker"><span className="live-dot"/> THE INFLUENCER MARKETING LOOP <span className="hero-edition">BUILT FOR WHAT’S NEXT ↗</span></div>
      <div className="hero-main">
        <div className="hero-copy"><h1>Influence.<br/>In full <span className="serif-word">loop.</span><span className="headline-dot"/></h1><p>From the first connection to the next conversion.<br className="desktop-break"/> Your creators, campaigns, and growth.<br className="desktop-break"/> Finally, in the same loop.</p><div className="hero-actions"><Link className="button button-dark" to="/start">Let’s build your campaign <Rocket size={18} aria-hidden="true"/></Link><Link className="text-link" to="/creators">Meet the creators <Users size={17} aria-hidden="true"/></Link></div><div className="hero-proof"><div className="avatar-stack">{creators.slice(0,3).map(c=><img key={c.id} src={`${import.meta.env.BASE_URL}images/${c.image}`} alt=""/>)}</div><span>Human connections.<br/><strong>Measurable impact.</strong></span><svg viewBox="0 0 70 35" className="hand-arrow" aria-hidden="true"><path d="M2 10C30 42 35-2 62 13m-9-10 10 10-14 2" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg></div></div>
        <div className="hero-visual"><div className="scene-topline"><span><i/> THE CAMPAIGN CIRCUIT</span><span>LIVE SIMULATION</span></div><Suspense fallback={<div className="track-loading"><LoopMark/><span>Getting in the loop…</span></div>}><Track paused={paused} jump={jump} onStage={setStage} onLap={()=>setLaps(l=>l+1)} onReady={setReady}/></Suspense>
          {ready === false && <div className="track-fallback"><LoopMark/><p>Your campaign, one connected circuit.</p><small>3D isn’t available in this browser. Explore every stage below.</small></div>}
          <div className="scene-label label-discover"><span>01</span> DISCOVER <i/></div><div className="scene-label label-brief"><span>02</span> BRIEF <i/></div><div className="scene-label label-launch"><span>03</span> LAUNCH <i/></div><div className="scene-label label-measure"><span>04</span> MEASURE <i/></div>
          <div className="lap-card"><span className="live-dot"/><span>LIVE LAP <strong>{String(laps).padStart(2,'0')}</strong></span><div className="lap-bars">{stages.map((s,i)=><i key={s.title} className={i<=stage?'filled':''}/>)}</div><button className="icon-button" aria-label={paused?'Play circuit animation':'Pause circuit animation'} onClick={()=>setPaused(!paused)}>{paused?<Play size={16} aria-hidden="true"/>:<Pause size={16} aria-hidden="true"/>}<span className="sr-only">{paused?'Play circuit animation':'Pause circuit animation'}</span></button></div>
          <div className="scene-bottom"><span><MousePointer2 size={13}/> DRAG TO EXPLORE</span><span>ONE LOOP. ZERO LOOSE ENDS.</span></div>
        </div>
      </div>
      <div className="circuit-stages" aria-label="Explore the campaign loop">{stages.map((s,i)=>{const Icon=icons[i];return <button key={s.title} className={stage===i?'stage-button active':'stage-button'} onClick={()=>selectStage(i)} aria-pressed={stage===i}><span className="stage-number">0{i+1}</span><Icon size={18}/><span>{s.title}</span><Check size={16} aria-hidden="true"/></button>;})}<div className="stage-caption"><LoopMark/><span>GOOD THINGS<br/>COME FULL CIRCLE.</span></div></div>
    </section>

    <section className="platform-strip"><div className="container"><span>BUILT FOR THE PLACES<br/>YOUR PEOPLE ARE.</span><div className="platform-names"><span>Instagram<span className="platform-symbol">◎</span></span><span>TikTok<span className="platform-symbol">♪</span></span><span className="youtube-word"><Play size={19} fill="currentColor"/> YouTube</span><span>LinkedIn<span className="in-badge">in</span></span></div></div></section>

    <section className="section container system-section"><div className="section-heading"><div><span className="eyebrow">LESS FRICTION. MORE FORWARD.</span><h2>Big ideas don’t grow<br/>in <span className="serif-word">silos.</span></h2></div><p>Neither should your campaigns. We connect the people, the process, and the performance — so every move leads to the next.</p></div>
      <div className="system-grid"><div className="system-feature"><div className="feature-top"><span className="mini-label">THE CONNECTED ADVANTAGE</span><LoopMark/></div><h3>Not another tool.<br/>Your whole loop.</h3><p>Discovery to delivery to data. A single, clear view of the work that moves your brand forward.</p><Link to="/pricing" className="text-link">Find your fit <Target size={18} aria-hidden="true"/></Link><div className="connected-diagram" aria-hidden="true"><div className="diagram-chip chip-one"><Search size={16}/> Creators</div><div className="diagram-chip chip-two"><Rocket size={16}/> Campaigns</div><div className="diagram-chip chip-three"><ChartNoAxesCombined size={16}/> Performance</div><div className="diagram-center"><LoopMark/></div></div></div>
        <div className="system-side"><div className="stat-card"><span className="mini-label">ROOM FOR YOUR AMBITION</span><strong>$<Counter value={1}/>K <span>→</span> $<Counter value={300}/>K+</strong><p>From a first test to a category-defining launch.</p><Link className="circle-link" to="/pricing" aria-label="Explore campaign pricing"><Target size={18} aria-hidden="true"/><span className="sr-only">Explore campaign pricing</span></Link></div><div className="clarity-card"><div className="clarity-icon"><ChartNoAxesCombined size={24}/></div><div><h3>Clarity. Not guesswork.</h3><p>Connect content to outcomes. Build on what works. Make your next lap smarter.</p></div><div className="mini-chart" aria-hidden="true">{[30,45,37,65,56,76,89,100].map((h,i)=><i key={i} style={{height:`${h}%`}}/>)}</div><span className="chart-caption">THE DIRECTION WE’RE HERE FOR ↗</span></div></div></div>
    </section>

    <section className="loop-section"><div className="container loop-layout"><div><span className="eyebrow">ONE SYSTEM. EVERY STAGE.</span><h2>Not a one-off.<br/>A better way<br/>to <span className="serif-word">go around.</span></h2><p>Good marketing keeps learning.<br/>That’s why we built it as a loop.</p><div className="loop-stage-count"><strong>0{stage+1}</strong><span>/ 04<br/>THE CAMPAIGN LOOP</span></div></div><div className="loop-accordion">{stages.map((s,i)=>{const Icon=icons[i];return <div key={s.title} className={stage===i?'loop-item open':'loop-item'}><button onClick={()=>selectStage(i)} aria-expanded={stage===i}><span>0{i+1}</span><Icon size={20}/><h3>{s.title}</h3>{stage===i?<CircleMinus size={20} aria-hidden="true"/>:<CirclePlus size={20} aria-hidden="true"/>}</button>{stage===i&&<div className="loop-detail"><h4>{s.label}</h4><p>{s.text}</p><span><Check size={14}/>{s.metric}</span></div>}</div>;})}</div></div></section>

    <section className="section container creator-preview"><div className="section-heading"><div><span className="eyebrow">REAL VOICES. REAL CONNECTION.</span><h2>Your brand.<br/>Their <span className="serif-word">people.</span></h2></div><div><p>Find the voices that make your brand feel less like an ad — and more like a conversation.</p><Link to="/creators" className="text-link">Explore the roster <Compass size={18} aria-hidden="true"/></Link></div></div><div className="preview-grid">{creators.slice(0,3).map(c=><Link to={`/creators?creator=${c.id}`} key={c.id} className="preview-card"><img src={`${import.meta.env.BASE_URL}images/${c.image}`} alt={`${c.name}, illustrative ${c.niche.toLowerCase()} creator`}/><span className="preview-niche">{c.niche}</span><div className="preview-info"><div><h3>{c.name}</h3><span>{c.handle}</span></div><span className="preview-arrow"><UserRound size={20} aria-hidden="true"/></span></div></Link>)}</div><p className="roster-note">A preview of the possibilities. Illustrative profiles, not represented talent.</p></section>

    <section className="faq-section container"><div><span className="eyebrow">A LITTLE MORE CLARITY</span><h2>Before your<br/>first <span className="serif-word">lap.</span></h2></div><div className="faq-list">{[
      ['What is infloop?', 'infloop is an influencer and performance marketing platform built around one connected workflow: discover creators, shape your brief, launch your campaign, and learn from performance.'],
      ['Is infloop right for my brand?', 'If you want to connect creator partnerships to clear campaign goals, you’re in the right place. Plans span focused $1K pilots to $300K+ flagship activations. Start with the planner to explore a fit.'],
      ['Can I bring my own creators?', 'Absolutely. Use the brief builder to describe existing creator relationships, or explore the illustrative roster to shape your ideal shortlist. Final talent availability is agreed during campaign planning.'],
      ['What happens when I build a brief?', 'Your brief is saved in this browser and can be downloaded as a JSON file. This public site does not send briefs, book creators, or charge you. It gives you a clear starting point for campaign planning.'],
    ].map(([q,a],i)=><div className="faq-item" key={q}><button onClick={()=>setFaq(faq===i?null:i)} aria-expanded={faq===i}>{q}{faq===i?<CircleMinus size={18} aria-hidden="true"/>:<CirclePlus size={18} aria-hidden="true"/>}</button>{faq===i&&<p>{a}</p>}</div>)}</div></section>
    <CampaignCTA/>
  </>;
}
