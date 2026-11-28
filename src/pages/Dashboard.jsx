import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { CalendarDays, LogOut, RefreshCw, Sparkles } from 'lucide-react';
import { apiRequest, useAuth } from '../api';
import ChoiceIcon from '../components/ChoiceIcon';
import { money } from '../lib';

const STATUS = { active: 'Active', invited: 'Invited', completed: 'Completed' };
const FILTERS = ['All', 'Active', 'Invited', 'Completed'];
const day = value => new Date(`${value}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function Dashboard() {
  const { user, token, loading, logout } = useAuth();
  const [campaigns, setCampaigns] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('All');

  const load = useCallback(() => {
    setError(''); setCampaigns(null);
    return apiRequest('/campaigns', { token })
      .then(data => setCampaigns(data.campaigns))
      .catch(failure => { if (failure.status === 401) logout(); else setError(failure.message); });
  }, [token, logout]);
  useEffect(() => { if (user) load(); }, [user, load]);

  if (!token) return <Navigate to="/login" replace/>;
  if (loading || !user) return <section className="container empty-state" role="status"><span className="eyebrow"><span className="live-dot"/> ONE MOMENT</span><h2>Loading your dashboard…</h2></section>;

  const list = campaigns || [];
  const count = status => list.filter(c => c.status === status).length;
  const visible = list.filter(c => filter === 'All' || STATUS[c.status] === filter);
  const earnings = list.filter(c => c.status !== 'invited').reduce((sum, c) => sum + c.feeCents, 0) / 100;

  return <section className="container dashboard-page">
    <div className="brief-page-heading">
      <div><span className="eyebrow"><span className="live-dot"/> CREATOR DASHBOARD</span><h1>Hi, {user.name.split(' ')[0]}.<br/><span className="serif-word">Here’s your loop.</span></h1><p>Signed in as {user.email}</p></div>
      <button className="button button-outline" onClick={logout}>Log out <LogOut size={16} aria-hidden="true"/></button>
    </div>
    <dl className="dashboard-stats">
      <div><dt>Active campaigns</dt><dd>{count('active')}</dd></div>
      <div><dt>Invitations</dt><dd>{count('invited')}</dd></div>
      <div><dt>Completed</dt><dd>{count('completed')}</dd></div>
      <div><dt>Active + completed fees</dt><dd>{money(earnings)}</dd></div>
    </dl>
    <div className="filter-row"><div className="niche-filters" aria-label="Filter campaigns by status">{FILTERS.map(name => <button key={name} className={filter === name ? 'filter-pill active' : 'filter-pill'} aria-pressed={filter === name} onClick={() => setFilter(name)}>{name}</button>)}</div><button className="text-link" onClick={load} disabled={!campaigns && !error}><RefreshCw size={14} aria-hidden="true"/> Refresh</button></div>
    <div className="roster-summary"><span role="status">{campaigns ? `${visible.length} ${visible.length === 1 ? 'campaign' : 'campaigns'}` : error ? 'Campaigns unavailable' : 'Loading campaigns…'}</span>{list.some(c => c.isSample) && <span>INCLUDES SAMPLE CAMPAIGNS <Sparkles size={12} aria-hidden="true"/></span>}</div>
    {error && <div className="empty-state"><h2>We couldn’t load your campaigns.</h2><p>{error}</p><button className="button button-dark" onClick={load}>Try again <RefreshCw size={16} aria-hidden="true"/></button></div>}
    {campaigns && visible.length === 0 && <div className="empty-state"><h2>Nothing here. Yet.</h2><p>{filter === 'All' ? 'Campaigns you’re added to will appear here.' : `You have no ${filter.toLowerCase()} campaigns.`}</p></div>}
    {visible.length > 0 && <ul className="campaign-list">{visible.map(c => <li className="campaign-row" key={c.id}>
      <div className="campaign-main"><span className="mini-label">{c.brand.toUpperCase()}{c.isSample && <em className="sample-tag">Sample</em>}</span><h2>{c.title}</h2><p>{c.deliverables}</p></div>
      <div className="campaign-meta"><span><ChoiceIcon label={c.platform} size={14}/>{c.platform}</span><span><ChoiceIcon label={c.goal} size={14}/>{c.goal}</span><span><CalendarDays size={14} aria-hidden="true"/>{day(c.startsOn)} – {day(c.endsOn)}</span></div>
      <div className="campaign-side"><span className={`status-badge status-${c.status}`}>{STATUS[c.status]}</span><strong>{money(c.feeCents / 100)}</strong></div>
    </li>)}</ul>}
  </section>;
}
