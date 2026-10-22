import React, { useEffect, useState } from 'react';
import { adminApi } from './adminApi.js';
import { useLoad } from './useLoad.js';
import { Chips, Section, Row, Note, Empty, Btn, Field, num } from './ui.jsx';

function Detail({ tg, onBack, notify }) {
  const { data: u, error, reload } = useLoad(() => adminApi(`/users/${tg}`), [tg]);
  const [amount, setAmount] = useState('100');
  const [msg, setMsg] = useState('');

  const run = async (fn, ok) => {
    try {
      await fn();
      if (ok) notify(ok, 'success');
      reload();
    } catch (e) {
      notify(e.message, 'error');
    }
  };
  if (error) return <><button type="button" className="ad-back" onClick={onBack}>‹ Back</button><Note tone="bad">{error}</Note></>;
  if (!u) return <Empty>Loading…</Empty>;
  const us = u.usage;
  const adjust = (sign) => {
    const n = Math.trunc(Number(amount));
    if (!n || n < 1) return notify('Enter an amount', 'error');
    return run(() => adminApi(`/users/${tg}/balance`, { method: 'POST', body: { delta: sign * n } }), sign > 0 ? `+${n} pts added` : `−${n} pts deducted`);
  };
  const reset = (what, t) => run(() => adminApi(`/users/${tg}/reset`, { method: 'POST', body: { what } }), `${t} reset`);
  const RESETS = [
    ['games', `Spin / Scratch · ${us.spins}/${us.spinLimit} & ${us.scratches}/${us.scratchLimit} used · cooldown`, 'Spin / Scratch'],
    ['main', `Main Watch Ads · ${us.mainAds}/${us.mainLimit} used + cooldown`, 'Main Watch Ads'],
    ['task', `Daily Task · Watch ${us.taskTarget} Ads · ${us.taskAds}/${us.taskTarget} progress`, 'Daily Task'],
    ['piggy', 'Piggy Bank · restart the timer', 'Piggy Bank'],
  ];

  return (
    <>
      <button type="button" className="ad-back" onClick={onBack}>‹ Users</button>
      <section className="ad-card">
        <div className="ad-user">
          <div className="ad-avatar">{u.name.slice(0, 2).toUpperCase()}</div>
          <div className="grow"><b>{u.name}</b><p>{u.username ? '@' + u.username + ' · ' : ''}Telegram ID {u.telegramId}</p></div>
          <span className={`ad-badge ${u.banned ? 'bad' : 'good'}`}>{u.banned ? 'BANNED' : 'ACTIVE'}</span>
        </div>
        <div className="ad-rule" />
        <div className="ad-two">
          <Row k="Balance" v={`${num(u.balance)} pts`} tone="pink" />
          <Row k="Total earned" v={`${num(u.totalEarned)} pts`} />
          <Row k="Ads watched" v={num(u.adsWatched)} />
          <Row k="Same-IP accounts" v={u.sameIpAccounts} tone={u.sameIpAccounts ? 'bad' : ''} />
        </div>
      </section>

      <Section title="Edit Balance" badge="Audit logged">
        <Field value={amount} onChange={setAmount} type="number" suffix="pts" />
        <div className="ad-actions two">
          <Btn tone="green" onClick={() => adjust(1)}>+ Add Points</Btn>
          <Btn tone="redline" onClick={() => adjust(-1)}>− Deduct Points</Btn>
        </div>
        <p className="ad-hint">Shows in the user’s Recent Activity as “Admin adjustment”.</p>
      </Section>

      <Section title="Reset Cooldowns & Daily Limits" badge="One tap">
        {RESETS.map(([k, t, name]) => (
          <div className="ad-item" key={k}><span>{t}</span><Btn tone="line" onClick={() => reset(k, name)}>🔄 Reset</Btn></div>
        ))}
      </Section>

      <Section title="Referral Tree" badge={`${u.friends.length} invited`}>
        <Row k="Active" v={`${u.friends.filter((f) => f.active).length} friends`} tone="good" />
        <Row k="Pending" v={`${u.friends.filter((f) => !f.active).length} friends`} />
        {u.friends.length === 0 && <Empty>No invited friends.</Empty>}
        {u.friends.map((f) => (
          <div className="ad-item" key={f.telegramId}>
            <span>{f.name} · {f.active ? `${f.ads} ads completed` : 'awaiting qualification'}{f.sameIp ? ' · same IP ⚠' : ''}</span>
            <span className={`ad-badge ${f.active ? 'good' : 'warn'}`}>{f.active ? 'ACTIVE' : 'PENDING'}</span>
          </div>
        ))}
        <p className="ad-hint">Open each invited account to investigate possible fake accounts.</p>
      </Section>

      <div className="ad-actions two">
        <Btn tone="redline" onClick={() => window.confirm('Ban this user?') && run(() => adminApi(`/users/${tg}/ban`, { method: 'POST', body: { banned: true } }), 'User banned')}>🚫 Ban User</Btn>
        <Btn tone="green" onClick={() => run(() => adminApi(`/users/${tg}/ban`, { method: 'POST', body: { banned: false } }), 'User unbanned')}>✅ Unban User</Btn>
      </div>

      <Section title="Send Direct Bot Message">
        <Field area rows={3} value={msg} onChange={setMsg} placeholder="Write a message (HTML like <b>bold</b> works)" />
        <Btn className="full" onClick={() => msg.trim() ? run(async () => { await adminApi(`/users/${tg}/message`, { method: 'POST', body: { text: msg } }); setMsg(''); }, 'Message sent') : notify('Write a message first', 'error')}>💬 Send Direct Bot Message</Btn>
      </Section>
    </>
  );
}

export default function Users({ notify }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('all');
  const [sel, setSel] = useState(null);
  const [term, setTerm] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim()), 350); // wait while typing
    return () => clearTimeout(t);
  }, [q]);
  const { data, error } = useLoad(() => adminApi(`/users?sort=${sort}&search=${encodeURIComponent(term)}`), [sort, term]);

  if (sel) return <Detail tg={sel} onBack={() => setSel(null)} notify={notify} />;
  return (
    <>
      <p className="ad-eyebrow">ShadowEarn Admin</p>
      <h1 className="ad-title">User Management</h1>
      <p className="ad-sub">Search, inspect referrals and manage account limits.</p>
      <div className="ad-search"><input placeholder="Search Telegram ID or @username" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <Chips items={[['all', 'All'], ['balance', '🏆 Top Balance'], ['inviters', '👥 Top Inviters'], ['banned', '🚫 Banned']]} value={sort} onChange={setSort} />
      {error && <Note tone="bad">{error}</Note>}
      {!data && !error && <Empty>Loading…</Empty>}
      {data && data.users.length === 0 && <Empty>No users found.</Empty>}
      {data && data.users.map((u) => (
        <button type="button" key={u.telegramId} className="ad-card ad-userbtn" onClick={() => setSel(u.telegramId)}>
          <div className="ad-user">
            <div className="ad-avatar">{u.name.slice(0, 2).toUpperCase()}</div>
            <div className="grow"><b>{u.name}</b><p>{u.username ? '@' + u.username + ' · ' : ''}ID {u.telegramId}</p></div>
            <div className="ad-right"><b className="pink">{num(u.balance)} pts</b><small>{u.invited != null ? `${u.invited} invited` : u.banned ? 'banned' : `${num(u.adsWatched)} ads`}</small></div>
          </div>
        </button>
      ))}
    </>
  );
}
