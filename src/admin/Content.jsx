import React, { useEffect, useState } from 'react';
import { Sheet } from '../components/ui.jsx';
import { adminApi } from './adminApi.js';
import { useLoad } from './useLoad.js';
import { Chips, Section, Row, Note, Empty, Btn, Field, Toggle, num, when } from './ui.jsx';

const TYPES = [['channel', 'Telegram Channel (Bot Auto-Verify)'], ['link', 'External Website Link'], ['ad', 'Ad Offer']];

function Tasks({ notify }) {
  const { data, error, reload } = useLoad(() => adminApi('/tasks'));
  const [f, setF] = useState({ title: '', type: 'channel', reward: '10', url: '', channel: '' });
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const run = async (fn, ok) => {
    try {
      await fn();
      notify(ok, 'success');
      reload();
    } catch (e) {
      notify(e.message, 'error');
    }
  };
  return (
    <>
      <Section title="＋ Add New Sponsored Task" badge="Live in app">
        <Field label="Task Title" value={f.title} onChange={set('title')} placeholder="Join ABC Channel" />
        <label className="ad-field">
          <span>Task Type</span>
          <select className="ad-select" value={f.type} onChange={(e) => set('type')(e.target.value)}>
            {TYPES.map(([id, t]) => <option key={id} value={id}>{t}</option>)}
          </select>
        </label>
        <Field label="Reward" type="number" value={f.reward} onChange={set('reward')} suffix="pts" />
        {f.type !== 'ad' && <Field label="Link" value={f.url} onChange={set('url')} placeholder="https://t.me/abc_channel" />}
        {f.type === 'channel' && <Field label="Channel username" value={f.channel} onChange={set('channel')} placeholder="@abc_channel" />}
        {f.type === 'channel' && <Note>The bot checks membership with getChatMember. Add the bot as an admin of that channel so the check works; without it the reward is given after the link was opened.</Note>}
        {f.type === 'ad' && <Note>Ad Offer shows a short video ad and pays the reward (limit 3 per day per user).</Note>}
        <Btn className="full" onClick={() => run(async () => { await adminApi('/tasks', { method: 'POST', body: f }); setF({ title: '', type: f.type, reward: f.reward, url: '', channel: '' }); }, 'Task added')}>＋ Add Task</Btn>
      </Section>

      <Section title="Active Tasks" badge={`${data?.tasks.filter((t) => t.active).length ?? 0} published`} tone="good">
        {error && <Note tone="bad">{error}</Note>}
        {data && data.tasks.length === 0 && <Empty>No tasks yet.</Empty>}
        {data && data.tasks.map((t) => (
          <div className="ad-item" key={t.id}>
            <span><b>{t.title}</b><br /><small>{{ channel: 'Auto-verify', link: 'Website', ad: 'Ad Offer' }[t.type]} · +{t.reward} pts{t.channel ? ' · @' + t.channel : ''}{t.active ? '' : ' · paused'}</small></span>
            <span className="ad-stack">
              <Btn tone="redline" onClick={() => run(() => adminApi(`/tasks/${t.id}`, { method: 'PATCH', body: { active: !t.active } }), t.active ? 'Paused' : 'Resumed')}>{t.active ? '⏸ Pause' : '▶ Resume'}</Btn>
              <Btn tone="redline" onClick={() => window.confirm('Delete this task?') && run(() => adminApi(`/tasks/${t.id}`, { method: 'DELETE' }), 'Deleted')}>🗑 Delete</Btn>
            </span>
          </div>
        ))}
      </Section>
    </>
  );
}

function Promos({ notify }) {
  const { data, error, reload } = useLoad(() => adminApi('/promos'));
  const [f, setF] = useState({ code: '', reward: '20', maxUses: '100', hours: '24', requireAd: true });
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const run = async (fn, ok) => {
    try {
      await fn();
      notify(ok, 'success');
      reload();
    } catch (e) {
      notify(e.message, 'error');
    }
  };
  const left = (p) => {
    if (!p.expiresAt) return 'No expiry';
    const h = Math.round((new Date(p.expiresAt) - Date.now()) / 3600_000);
    return h <= 0 ? 'Expired' : `Expires in ${h}h`;
  };
  return (
    <>
      <Section title="Create Promo Code" badge="Home · Redeem card">
        <div className="ad-two">
          <Field label="Code Name" value={f.code} onChange={(v) => set('code')(v.toUpperCase())} placeholder="PINK50" />
          <Field label="Reward Points" type="number" value={f.reward} onChange={set('reward')} suffix="pts" />
          <Field label="Max Claims" type="number" value={f.maxUses} onChange={set('maxUses')} suffix="users" />
          <Field label="Expiry Time" type="number" value={f.hours} onChange={set('hours')} suffix="hours" />
        </div>
        <Toggle label="Require 1 Ad Watch" hint="Show one ad before points are credited" on={f.requireAd} onChange={set('requireAd')} />
        <p className="ad-hint">Max claims 0 = unlimited · expiry 0 = never. Each user can use a code once.</p>
        <Btn className="full" onClick={() => run(async () => { await adminApi('/promos', { method: 'POST', body: f }); setF({ ...f, code: '' }); }, 'Promo code created')}>＋ Create Promo Code</Btn>
      </Section>

      <Section title="Current Codes" badge="Active" tone="good">
        {error && <Note tone="bad">{error}</Note>}
        {data && data.promos.length === 0 && <Empty>No promo codes yet.</Empty>}
        {data && data.promos.map((p) => (
          <div className="ad-item" key={p.id}>
            <span>
              <code className="ad-code">{p.code}</code><br />
              <small>{p.reward} pts · {p.maxUses ? `max ${p.maxUses} claims` : 'unlimited'} · {p.requireAd ? 'Ad required' : 'No ad'}</small><br />
              <span className="ad-badge">{p.uses} / {p.maxUses || '∞'} used</span> <span className="ad-badge warn">{left(p)}</span>
            </span>
            <Btn tone="redline" onClick={() => window.confirm(`Delete ${p.code}?`) && run(() => adminApi(`/promos/${p.id}`, { method: 'DELETE' }), 'Deleted')}>🗑 Delete</Btn>
          </div>
        ))}
      </Section>
    </>
  );
}

function Broadcast({ notify }) {
  const { data, reload } = useLoad(() => adminApi('/broadcast'));
  const [f, setF] = useState({ text: '', imageUrl: '', buttonText: '🚀 Open App', appUrl: '' });
  const [ask, setAsk] = useState(false);
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const job = data?.job;

  useEffect(() => {
    if (!job?.running) return undefined;
    const t = setInterval(reload, 2000);
    return () => clearInterval(t);
  }, [job?.running, reload]);

  const send = async () => {
    try {
      await adminApi('/broadcast', { method: 'POST', body: { ...f, confirm: true } });
      notify('Broadcast started', 'success');
      setAsk(false);
      reload();
    } catch (e) {
      notify(e.message, 'error');
      setAsk(false);
    }
  };
  return (
    <>
      <Section title="New Broadcast" badge="HTML supported">
        <Field area rows={5} label="Message text" value={f.text} onChange={set('text')} placeholder="✅ All requested withdrawals have been transferred today." />
        <Field label="Image URL (optional)" value={f.imageUrl} onChange={set('imageUrl')} placeholder="https://example.com/payment-proof.png" />
        <Field label="Inline button text" value={f.buttonText} onChange={set('buttonText')} />
        <Field label="App URL (empty = this app)" value={f.appUrl} onChange={set('appUrl')} placeholder="https://t.me/shaddowearn_bot/app" />
      </Section>
      <Section title="Safe delivery queue" badge="Queue enabled" tone="good">
        <Row k="Recipients" v={data ? `${num(data.recipients)} users` : '…'} />
        <Row k="Rate limit" v="25 users / second" />
        <Row k="Queue status" v={job?.running ? `Sending ${num(job.sent + job.failed)} / ${num(job.total)}` : job?.finishedAt ? `Done · ${num(job.sent)} sent, ${num(job.failed)} failed` : 'Ready'} tone={job?.running ? 'pink' : 'good'} />
        <Note>Rate-limited queue helps avoid Telegram Bot API errors. Users who blocked the bot are skipped.</Note>
        <Btn className="full" disabled={!f.text.trim() || job?.running} onClick={() => setAsk(true)}>📤 Send to All Users</Btn>
      </Section>
      <Note tone="bad">A final recipient count and confirmation is shown before sending.</Note>
      {ask && (
        <Sheet title="Send broadcast?" onClose={() => setAsk(false)}>
          <p className="ad-hint">This will message <b>{num(data?.recipients)}</b> users. It cannot be undone.</p>
          <div className="ad-box">{f.text}</div>
          <Btn className="full" onClick={send}>Yes, send to {num(data?.recipients)} users</Btn>
          <Btn tone="line" className="full" onClick={() => setAsk(false)}>Cancel</Btn>
        </Sheet>
      )}
    </>
  );
}

export default function Content({ notify }) {
  const [tab, setTab] = useState('tasks');
  const titles = { tasks: ['Task & Offer Manager', 'Create, pause or remove Today’s Offers and Daily Tasks.'], promos: ['Promo Code Generator', 'Create and monitor Home tab redemption codes.'], broadcast: ['Telegram Broadcast', 'Send text, image and an Open App button to all users.'] }[tab];
  return (
    <>
      <p className="ad-eyebrow">ShadowEarn Admin</p>
      <h1 className="ad-title">{titles[0]}</h1>
      <p className="ad-sub">{titles[1]}</p>
      <Chips items={[['tasks', '📋 Tasks & Offers'], ['promos', '🎁 Promo Codes'], ['broadcast', '📢 Broadcast']]} value={tab} onChange={setTab} />
      {tab === 'tasks' && <Tasks notify={notify} />}
      {tab === 'promos' && <Promos notify={notify} />}
      {tab === 'broadcast' && <Broadcast notify={notify} />}
    </>
  );
}
