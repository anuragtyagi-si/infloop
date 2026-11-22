import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Bookmark, Check, Search, SlidersHorizontal, X, MapPin, ArrowRight, Users, Sparkles } from 'lucide-react';
import { creators } from '../data';
import { useShortlist } from '../App';
import { CampaignCTA } from './Home';

function ProfileDialog({ creator, close }) {
  const dialog = useRef(null);
  const { shortlist, toggle } = useShortlist();
  const saved = shortlist.includes(creator.id);
  useEffect(() => {
    const modal = dialog.current;
    if (!modal.open) modal.showModal();
    // Removing the dialog closes it naturally. Closing during StrictMode's
    // effect replay would dispatch onClose and dismiss a newly opened profile.
  }, []);
  return <dialog ref={dialog} className="profile-dialog" aria-labelledby={`profile-${creator.id}-title`} onClose={close} onClick={event=>{if(event.target===dialog.current)close();}}><div className="profile-content"><button autoFocus className="icon-button dialog-close" onClick={close} aria-label="Close creator profile"><X/></button><img className="profile-image" src={`${import.meta.env.BASE_URL}images/${creator.image}`} alt={creator.name}/><div className="profile-details"><span className="eyebrow">{creator.niche.toUpperCase()} CREATOR</span><h2 id={`profile-${creator.id}-title`}>{creator.name}</h2><p className="handle">{creator.handle}</p><span className="location"><MapPin size={14}/>{creator.location}</span><p>{creator.bio}</p><div className="profile-stats"><div><strong>{creator.followers}</strong><span>Followers</span></div><div><strong>{creator.engagement}</strong><span>Engagement</span></div></div><button className={`button ${saved?'button-outline':'button-dark'}`} onClick={()=>toggle(creator.id)}>{saved?<Check size={17}/>:<Bookmark size={17}/>} {saved?'Added to shortlist':'Add to shortlist'}</button><Link to="/start" onClick={close} className="text-link">Build your campaign <ArrowUpRight size={17}/></Link><small>Illustrative profile and metrics. Not represented talent; no booking or availability is implied.</small></div></div></dialog>;
}

export default function Creators() {
  const [params,setParams] = useSearchParams();
  const [query,setQuery] = useState('');
  const [niche,setNiche] = useState('All creators');
  const [sort,setSort] = useState('Featured');
  const [onlySaved,setOnlySaved] = useState(false);
  const { shortlist, toggle } = useShortlist();
  const selected = creators.find(c=>c.id===params.get('creator'));
  const visible = creators.filter(c => (niche==='All creators'||niche===c.niche) && `${c.name} ${c.handle} ${c.niche} ${c.location}`.toLowerCase().includes(query.toLowerCase()) && (!onlySaved||shortlist.includes(c.id))).sort((a,b)=>sort==='Most followers'?parseInt(b.followers)-parseInt(a.followers):sort==='Highest engagement'?parseFloat(b.engagement)-parseFloat(a.engagement):0);
  const clear = () => {setQuery('');setNiche('All creators');setOnlySaved(false);};
  return <>
    <section className="page-intro container creators-intro"><div><span className="eyebrow"><span className="live-dot"/> THE PEOPLE BEHIND THE POSSIBILITIES</span><h1>Find your<br/><span className="serif-word">kind of influence.</span></h1></div><div className="intro-aside"><div className="tiny-loop">↗</div><p>Not just a following. A shared feeling.<br/>Discover voices that belong in your brand’s story.</p><span className="mini-label">GOOD CHEMISTRY STARTS HERE.</span></div></section>
    <section className="container roster-section"><div className="roster-tools"><label className="search-field"><Search size={19}/><input type="search" placeholder="Search names, niches, or cities" aria-label="Search creators" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button className="icon-button" onClick={()=>setQuery('')} aria-label="Clear search"><X size={16}/></button>}</label><button className={`button button-outline shortlist-filter ${onlySaved?'selected':''}`} onClick={()=>setOnlySaved(!onlySaved)} aria-pressed={onlySaved}><Bookmark size={16}/> My shortlist <span>{shortlist.length}</span></button></div>
      <div className="filter-row"><div className="niche-filters" aria-label="Filter creators by niche">{['All creators','Lifestyle','Fashion','Fitness','Tech','Food','Travel'].map(n=><button key={n} className={niche===n?'filter-pill active':'filter-pill'} aria-pressed={niche===n} onClick={()=>setNiche(n)}>{n}</button>)}</div><label className="sort-select"><SlidersHorizontal size={15}/><select aria-label="Sort creators" value={sort} onChange={e=>setSort(e.target.value)}><option>Featured</option><option>Most followers</option><option>Highest engagement</option></select></label></div>
      <div className="roster-summary"><span role="status">{visible.length} {visible.length===1?'creator':'creators'} {onlySaved?'in your shortlist':'to explore'}</span><span>ILLUSTRATIVE ROSTER <Sparkles size={12}/></span></div>
      {visible.length===0?<div className="empty-state"><Search size={32}/><h2>No connections. Yet.</h2><p>{onlySaved?'Save a creator to start building your shortlist.':'Try a different name, niche, or city.'}</p><button className="button button-dark" onClick={clear}>Explore all creators <ArrowRight size={17}/></button></div>:<div className="creator-grid">{visible.map((c,i)=>{const saved=shortlist.includes(c.id);return <article className="creator-card" key={c.id}><div className="creator-photo" style={{backgroundColor:c.color}}><button className="photo-button" onClick={()=>setParams({creator:c.id})} aria-label={`View ${c.name}'s profile`}><img src={`${import.meta.env.BASE_URL}images/${c.image}`} alt={`${c.name}, illustrative creator`} loading={i>2?'lazy':'eager'}/></button><span className="creator-niche">{c.niche}</span><button className={`save-button ${saved?'saved':''}`} onClick={()=>toggle(c.id)} aria-label={`${saved?'Remove':'Add'} ${c.name} ${saved?'from':'to'} shortlist`} aria-pressed={saved}>{saved?<Check size={18}/>:<Bookmark size={18}/>}</button></div><div className="creator-details"><div className="creator-title"><button onClick={()=>setParams({creator:c.id})}><h2>{c.name}</h2><span>{c.handle}</span></button><button className="circle-link" onClick={()=>setParams({creator:c.id})} aria-label={`View ${c.name}'s profile`}><ArrowUpRight size={20}/></button></div><span className="location"><MapPin size={13}/>{c.location}</span><div className="creator-metrics"><span><strong>{c.followers}</strong> Followers</span><span><strong>{c.engagement}</strong> Engagement</span></div></div></article>;})}</div>}
      <div className="roster-disclaimer"><Users size={20}/><p>This is a sample roster to help you explore the experience. Profiles, audience sizes, and engagement rates are illustrative; images are stock photography. No talent representation or availability is implied.</p></div>
    </section>
    {shortlist.length>0&&<div className="shortlist-bar"><div><span className="shortlist-icon"><Bookmark size={17}/></span><span><strong>{shortlist.length} {shortlist.length===1?'creator':'creators'} shortlisted</strong><small>Saved on this device. Ready for your brief.</small></span></div><Link className="button button-lime" to="/start">Build a campaign <ArrowUpRight size={17}/></Link></div>}
    <CampaignCTA/>
    {selected&&<ProfileDialog key={selected.id} creator={selected} close={()=>setParams({})}/>}
  </>;
}
