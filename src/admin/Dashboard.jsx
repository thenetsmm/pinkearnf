import React, { useState } from 'react';
import { adminApi } from './adminApi.js';
import { useLoad } from './useLoad.js';
import { Chips, Section, Row, Note, Empty, Btn, Toggle, num, when } from './ui.jsx';

const BREAK = [
  ['main', 'Main Watch Ads'], ['task', 'Daily Task · Watch 5 Ads'], ['spin', 'Spin Ads'],
  ['scratch', 'Scratch Ads'], ['piggy', 'Piggy Bank 2× Ads'], ['promo', 'Promo Ads'], ['offer', "Today's Offers"],
];

function Stat({ icon, label, value, sub, tone }) {
  return (
    <div className="ad-stat">
      <p>{icon} {label}</p>
      <b className={tone}>{value}</b>
      <small>{sub}</small>
    </div>
  );
}

function Overview() {
  const [range, setRange] = useState('today');
  const { data: d, error } = useLoad(() => adminApi(`/overview?range=${range}`), [range]);
  const label = { today: 'Today', yesterday: 'Yesterday', '7d': 'Last 7 days', all: 'All time' }[range];
  return (
    <>
      <Chips items={[['today', 'Today'], ['yesterday', 'Yesterday'], ['7d', '7 Days'], ['all', 'All Time']]} value={range} onChange={setRange} />
      {error && <Note tone="bad">{error}</Note>}
      {!d && !error && <Empty>Loading…</Empty>}
      {d && (
        <>
          <div className="ad-grid">
            <Stat icon="👥" label="Total Users" value={num(d.users.total)} sub={<>Joined <b className="good">+{num(d.users.joined)}</b></>} />
            <Stat icon="🟢" label="Daily Active Users" value={num(d.users.dau)} sub={range === '7d' || range === 'all' ? 'DAU · daily average' : 'DAU · selected day'} />
            <Stat icon="📺" label="Ads Watched" value={num(d.ads.total)} sub="All placements included" />
            <Stat icon="💵" label="Estimated Ad Revenue" value={num(d.revenueKs)} sub={`Ks · ${num(d.ads.total)} × ${d.adRevenueKs}`} />
            <Stat icon="🎁" label="Points Distributed" value={num(d.pointsDistributed)} sub={`pts · 1 pt = ${1 / d.ptsPerKs} Ks`} />
            <Stat icon="📈" label="Net Profit Estimate" value={num(d.netProfitKs)} tone={d.netProfitKs >= 0 ? 'good' : 'bad'} sub="Ks · revenue − points" />
          </div>

          <Section title="🏦 Total Unpaid Liability" badge="Non-banned balances">
            <p className="ad-big pink">{num(d.liabilityPts)} pts</p>
            <p className="ad-hint">≈ {num(Math.round(d.liabilityPts / d.ptsPerKs))} Ks to keep in your KBZ Pay / Wave account · sum of unpaid points held by all non-banned users.</p>
          </Section>

          <Section title={`${label} · ads breakdown`} badge={`${num(d.ads.total)} total`}>
            {BREAK.map(([k, t]) => <Row key={k} k={t} v={num(d.ads.breakdown[k])} />)}
            <div className="ad-sum"><span>Estimated profit</span><b className={d.netProfitKs >= 0 ? 'good' : 'bad'}>{num(d.netProfitKs)} Ks</b></div>
          </Section>
          <Note>Revenue uses {d.adRevenueKs} Ks per ad (change it in Settings); net profit subtracts the points handed out at 1 pt = {1 / d.ptsPerKs} Ks.</Note>
        </>
      )}
    </>
  );
}

function Security({ notify }) {
  const { data: s, error, reload } = useLoad(() => adminApi('/security'));
  const [saving, setSaving] = useState(false);

  const setSwitch = async (key, on) => {
    setSaving(true);
    try {
      await adminApi('/settings', { method: 'PUT', body: { values: { [key]: on } } });
      notify(on ? 'Switched ON' : 'Switched OFF', 'success');
      await reload();
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };
  const banAll = async (g) => {
    if (!window.confirm(`Ban all ${g.count} accounts on this IP?`)) return;
    try {
      const r = await adminApi('/security/ban', { method: 'POST', body: { telegramIds: g.users.map((u) => u.telegramId) } });
      notify(`${r.banned} accounts banned`, 'success');
      reload();
    } catch (e) {
      notify(e.message, 'error');
    }
  };

  if (error) return <Note tone="bad">{error}</Note>;
  if (!s) return <Empty>Loading…</Empty>;
  return (
    <>
      {s.sameIp.length === 0 ? (
        <Section title="🚨 Same IP · Multi-account activity" badge="All clear" tone="good"><Empty>No IP address is shared by 3 or more accounts.</Empty></Section>
      ) : (
        s.sameIp.map((g) => (
          <Section key={g.ip} title="🚨 Same IP · Multi-account activity" badge="HIGH RISK" tone="bad">
            <p className="ad-hint">{g.refersEachOther ? 'Possible self-referral loop' : 'Several accounts share one network'} · {g.count} accounts</p>
            <Row k="Shared IP address" v={g.ip} />
            <Row k="Referral pattern" v={g.refersEachOther ? 'Accounts refer each other' : 'No direct referrals'} />
            {g.users.map((u) => (
              <div className="ad-item" key={u.telegramId}>
                <span>{u.name} · ID {u.telegramId}</span>
                <span className={`ad-badge ${u.banned ? '' : u.flagged ? 'bad' : 'warn'}`}>{u.banned ? 'BANNED' : u.flagged ? 'FLAGGED' : 'REVIEW'}</span>
              </div>
            ))}
            <Btn tone="redline" className="full" onClick={() => banAll(g)}>🚫 Quick Ban All {g.count} Accounts</Btn>
          </Section>
        ))
      )}

      <Section title="⚡ Fast Ad-Watcher / API Abuse" badge={`${s.fastAds.length} alerts`} tone={s.fastAds.length ? 'bad' : 'good'}>
        <p className="ad-hint">Ads that were claimed in under 5 seconds, last 24 hours.</p>
        {s.fastAds.length === 0 && <Empty>No suspicious claims.</Empty>}
        {s.fastAds.map((f) => (
          <div className="ad-item" key={f.telegramId}>
            <span><b>{f.name}</b><br /><small>Claimed after {f.seconds}s · {f.count} times</small></span>
            <span className="ad-badge bad">{f.seconds}s</span>
          </div>
        ))}
      </Section>

      <Section title="🛡️ Emergency Switches" badge="Admin only" tone="warn">
        <Toggle label="Maintenance Mode" hint="Show a maintenance screen to all regular users" on={s.switches.maintenance} onChange={(v) => !saving && setSwitch('maintenance', v)} />
        <Toggle label="Pause Withdrawals" hint="Temporarily disable withdrawal requests" on={s.switches.pauseWithdrawals} onChange={(v) => !saving && setSwitch('pauseWithdrawals', v)} />
        <Note>Maintenance preview: “🛠️ App is being upgraded. Please wait.” (admins can still open the app)</Note>
      </Section>

      <Section title="Recent Security Logs" badge="Latest 30">
        {s.logs.length === 0 && <Empty>Nothing logged yet.</Empty>}
        {s.logs.map((l) => <Row key={l.id} k={l.text} v={when(l.at)} />)}
      </Section>
    </>
  );
}

export default function Dashboard({ notify }) {
  const [tab, setTab] = useState('overview');
  return (
    <>
      <p className="ad-eyebrow">ShadowEarn Admin</p>
      <h1 className="ad-title">{tab === 'overview' ? 'Overview Dashboard' : 'Anti-Fraud & Security Logs'}</h1>
      <p className="ad-sub">{tab === 'overview' ? 'Live app health, ad revenue and outstanding liability.' : 'Investigate suspicious accounts and trigger emergency controls.'}</p>
      <Chips items={[['overview', '📊 Overview'], ['security', '🛡️ Security']]} value={tab} onChange={setTab} />
      {tab === 'overview' ? <Overview /> : <Security notify={notify} />}
    </>
  );
}
