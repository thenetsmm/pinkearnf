import React, { useState } from 'react';
import { Sheet } from '../components/ui.jsx';
import { copyText } from '../tg.js';
import { adminApi } from './adminApi.js';
import { useLoad } from './useLoad.js';
import { Chips, Row, Note, Empty, Btn, Field, num, when } from './ui.jsx';

const REASONS = [
  'Phone number or account name is incorrect',
  'Account information is incomplete',
  'Suspicious activity / fake referrals',
];

function Card({ w, onReject, onBan, onApprove, notify }) {
  const copy = async () => notify((await copyText(w.account)) ? 'Phone number copied' : 'Could not copy', 'success');
  return (
    <section className="ad-card">
      <div className="ad-user">
        <div className="ad-avatar">{(w.name || '?').slice(0, 2).toUpperCase()}</div>
        <div className="grow">
          <b>{w.name}</b>
          <p>{w.username ? '@' + w.username + ' · ' : ''}Telegram ID {w.telegramId}</p>
        </div>
        {w.fraud.risk && <span className="ad-badge bad">⚠ FRAUD RISK</span>}
      </div>
      <div className="ad-rule" />
      <div className="ad-between">
        <div><small>Requested payout</small><p className="ad-big pink">{num(w.amountKs)} Ks</p></div>
        <span className="ad-badge blue">{w.method}</span>
      </div>
      <div className="ad-row"><span>Phone number</span><b className="ad-copy">{w.account} <button type="button" onClick={copy}>📋 Copy</button></b></div>
      <Row k="Account name" v={w.accountName} />
      <Row k="Requested" v={when(w.createdAt)} />
      {w.status === 'rejected' && w.reason && <Row k="Reason" v={w.reason} tone="bad" />}

      <h4 className="ad-sub-h">🔍 Fraud Check <span className={`ad-badge ${w.fraud.risk ? 'bad' : 'good'}`}>{w.fraud.ads} ads watched</span></h4>
      <div className="ad-two">
        <Row k="Total ads" v={w.fraud.ads} tone={w.fraud.risk ? 'bad' : ''} />
        <Row k="Active referrals" v={w.fraud.active} />
        <Row k="Pending referrals" v={w.fraud.pending} />
        <Row k="Game points won" v={`${num(w.fraud.gamePoints)} pts`} />
      </div>
      {w.fraud.risk && <Note tone="bad">{w.fraud.note}</Note>}

      {w.status === 'pending' && (
        <>
          <div className="ad-actions">
            <Btn tone="green" onClick={() => onApprove(w)}>✅ Approve</Btn>
            <Btn tone="redline" onClick={() => onReject(w)}>❌ Reject & Refund</Btn>
            <Btn tone="redline" onClick={() => onBan(w)}>🚫 Reject & Ban</Btn>
          </div>
          <p className="ad-hint">Approve notifies the user by Telegram Bot. Reject & Ban rejects without refund.</p>
        </>
      )}
    </section>
  );
}

export default function Payouts({ me, notify }) {
  const [status, setStatus] = useState('pending');
  const [method, setMethod] = useState('all');
  const { data, error, reload } = useLoad(() => adminApi(`/withdrawals?status=${status}${method !== 'all' ? `&method=${encodeURIComponent(method)}` : ''}`), [status, method]);
  const [rej, setRej] = useState(null); // withdrawal being rejected
  const [ban, setBan] = useState(null);
  const [reason, setReason] = useState(REASONS[0]);
  const [custom, setCustom] = useState('');

  const act = async (fn, okText) => {
    try {
      await fn();
      notify(okText, 'success');
      setRej(null);
      setBan(null);
      reload();
    } catch (e) {
      notify(e.message, 'error');
    }
  };
  const approve = (w) => act(() => adminApi(`/withdrawals/${w.id}/approve`, { method: 'POST' }), 'Approved · user notified');
  const finalReason = custom.trim() || reason;

  return (
    <>
      <p className="ad-eyebrow">ShadowEarn Admin</p>
      <h1 className="ad-title">Withdrawal Management</h1>
      <p className="ad-sub">Review KBZ Pay and Wave requests with fraud signals in each card.</p>
      <Chips
        items={[['pending', `⏳ Pending${data ? ' ' + data.pendingCount : ''}`], ['success', '✅ Approved'], ['rejected', '❌ Rejected']]}
        value={status}
        onChange={setStatus}
      />
      <Chips items={[['all', 'All'], ...me.withdraw.methods.map((m) => [m, m])]} value={method} onChange={setMethod} />

      {error && <Note tone="bad">{error}</Note>}
      {!data && !error && <Empty>Loading…</Empty>}
      {data && data.items.length === 0 && <Empty>Nothing here.</Empty>}
      {data && data.items.map((w) => (
        <Card key={w.id} w={w} notify={notify} onApprove={approve} onReject={(x) => { setReason(REASONS[0]); setCustom(''); setRej(x); }} onBan={setBan} />
      ))}
      {data && <section className="ad-card"><div className="ad-card-head"><h3>Queue</h3><span className="ad-badge warn">{data.pendingCount} pending</span></div><p className="ad-hint">Newest first · copy the phone number to paste directly into KBZ Pay / Wave.</p></section>}

      {rej && (
        <Sheet title="Reject & Refund" onClose={() => setRej(null)}>
          <p className="ad-hint">{rej.amountKs} Ks · {rej.method} · {rej.account}. Select the reason shown in the user’s history.</p>
          {REASONS.map((r) => (
            <button key={r} type="button" className={`ad-radio ${!custom && reason === r ? 'on' : ''}`} onClick={() => { setReason(r); setCustom(''); }}>
              <i /> {r}
            </button>
          ))}
          <Field label="Or write your own reason" value={custom} onChange={setCustom} placeholder="e.g. KPay number is wrong" />
          <div className="ad-box">
            <Row k="Points returned" v={`+${num(rej.points)} pts`} tone="good" />
            <Row k="Reason stored" v={finalReason} />
          </div>
          <Btn className="full" onClick={() => act(() => adminApi(`/withdrawals/${rej.id}/reject`, { method: 'POST', body: { reason: finalReason } }), 'Rejected · points refunded')}>Confirm Reject & Refund</Btn>
          <Btn tone="line" className="full" onClick={() => setRej(null)}>Cancel</Btn>
        </Sheet>
      )}
      {ban && (
        <Sheet title="Reject & Ban" onClose={() => setBan(null)}>
          <Note tone="bad">This rejects {ban.amountKs} Ks WITHOUT refund and permanently bans {ban.name} (ID {ban.telegramId}).</Note>
          <Btn className="full" onClick={() => act(() => adminApi(`/withdrawals/${ban.id}/reject-ban`, { method: 'POST', body: { reason: 'Fraud detected' } }), 'Rejected and banned')}>Confirm Reject & Ban</Btn>
          <Btn tone="line" className="full" onClick={() => setBan(null)}>Cancel</Btn>
        </Sheet>
      )}
    </>
  );
}
