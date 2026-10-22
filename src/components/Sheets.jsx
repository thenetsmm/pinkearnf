import React, { useEffect, useState } from 'react';
import { Sheet, Button, Icon, Check, Empty } from './ui.jsx';
import { api } from '../api.js';
import { getPrefs, setPref, haptic, fmt, openTelegramLink } from '../tg.js';

const PAY_LOGO = { 'KBZ Pay': '/assets/pay/kbzpay.png', 'Wave Pay': '/assets/pay/wavepay.png' };
const payName = (m) => m.replace(/\s+/g, ''); // "KBZ Pay" -> "KBZPay"
const PHONE_RE = /^(\+?959|09)\d{7,10}$/;

const PhoneIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
  </svg>
);
const CloseIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
);

export function WithdrawSheet({ me, onClose, onDone, notify }) {
  const { withdraw, balance } = me;
  const methods = withdraw.methods;
  const [method, setMethod] = useState(methods[0] || '');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  const ks = Math.floor(balance / withdraw.ptsPerKs);
  const label = payName(method);
  const phoneOk = PHONE_RE.test(phone.replace(/[\s-]/g, ''));
  const valid = method && name.trim().length >= 2 && phoneOk;

  async function submit() {
    setBusy(true);
    try {
      await api('/api/withdraw', {
        method: 'POST',
        body: { method, account: phone.replace(/[\s-]/g, ''), accountName: name.trim(), points: balance },
      });
      haptic('success');
      notify('Withdrawal requested! We will pay you soon.', 'success');
      onDone();
    } catch (e) {
      haptic('error');
      notify(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sheet-wrap" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Withdraw Funds" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grab" />
        <div className="sheet-head">
          <h2>Withdraw Funds</h2>
          <button type="button" className="sheet-x" onClick={onClose} aria-label="Close"><CloseIcon /></button>
        </div>

        <div className="wd-balance">
          <p className="muted">Available balance</p>
          <p className="wd-ks">{fmt(ks)} <span>Ks</span></p>
          <p className="muted">Minimum payout {fmt(withdraw.min)} Ks</p>
        </div>

        <p className="wd-label strong">Select payout method</p>
        <div className="methods" role="radiogroup">
          {methods.map((m) => (
            <button key={m} type="button" role="radio" aria-checked={method === m} className={`method ${method === m ? 'on' : ''}`} onClick={() => setMethod(m)}>
              {PAY_LOGO[m] && <img src={PAY_LOGO[m]} alt="" width="34" height="34" />}
              <span className="method-name">{m}</span>
              <span className="radio">{method === m && <Check size={16} />}</span>
            </button>
          ))}
        </div>

        <label className="wd-label" htmlFor="wd-name">{label} Account Name</label>
        <div className="field">
          <Icon name="user" size={22} />
          <input id="wd-name" maxLength={60} placeholder={`Enter ${label} account name`} value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <label className="wd-label" htmlFor="wd-phone">{label} Phone Number</label>
        <div className="field">
          <PhoneIcon />
          <input id="wd-phone" type="tel" inputMode="tel" maxLength={16} placeholder="09xxxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s-]/g, ''))} />
        </div>
        {phone && !phoneOk && <p className="field-err">Enter a valid Myanmar phone number (09…)</p>}

        <p className="wd-label">Withdrawal amount</p>
        <div className="field readonly">
          <Icon name="coins" size={22} />
          <span className="ro-val">{fmt(ks)} Ks</span>
        </div>

        <Button className="wide" disabled={!valid} busy={busy} onClick={submit}>Withdraw</Button>
      </div>
    </div>
  );
}

export function SettingsSheet({ onClose }) {
  const [prefs, setPrefs] = useState(getPrefs());
  const toggle = (k) => {
    const v = !prefs[k];
    setPref(k, v);
    setPrefs({ ...prefs, [k]: v });
    if (k === 'haptics' && v) haptic('medium');
  };
  return (
    <Sheet title="Settings" onClose={onClose}>
      {[
        ['sound', 'Sound', 'Play a sound when you earn points'],
        ['haptics', 'Vibration', 'Haptic feedback on actions'],
      ].map(([k, label, hint]) => (
        <div className="setting" key={k}>
          <div>
            <b>{label}</b>
            <p className="muted small">{hint}</p>
          </div>
          <button type="button" role="switch" aria-checked={prefs[k]} className={`switch ${prefs[k] ? 'on' : ''}`} onClick={() => toggle(k)} />
        </div>
      ))}
    </Sheet>
  );
}

const proofDate = (d) =>
  new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Public payout proofs: every paid withdrawal (name / number masked). */
export function ProofsSheet({ onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/proofs').then(setData).catch((e) => setError(e.message));
  }, []);

  return (
    <Sheet title="Payment Proofs" onClose={onClose}>
      <p className="muted small">Every withdrawal we pay is listed here and posted in our public channel. Names and numbers are partly hidden for privacy.</p>
      {data && (
        <div className="stats big">
          <div><span className="muted small">Payouts sent</span><b>{fmt(data.count)}</b></div>
          <div><span className="muted small">Total paid</span><b>{fmt(data.totalKs)} Ks</b></div>
        </div>
      )}
      {error && <Empty>{error}</Empty>}
      {!data && !error && <Empty>Loading…</Empty>}
      {data && data.items.length === 0 && <Empty>No payouts yet. The first ones will appear here.</Empty>}
      {data && data.items.length > 0 && (
        <div className="list proofs-list">
          {data.items.map((p) => (
            <div className="list-row" key={p.id}>
              <div className="grow">
                <b>{p.name} · {fmt(p.amountKs)} Ks</b>
                <p className="muted small">{p.method} · {p.account}</p>
                <p className="muted small">{proofDate(p.createdAt)}</p>
              </div>
              <span className="st st-success">Paid ✓</span>
            </div>
          ))}
        </div>
      )}
      {data?.channel && (
        <Button className="wide mt" onClick={() => openTelegramLink(data.channel.link)}>
          Open proof channel @{data.channel.username}
        </Button>
      )}
    </Sheet>
  );
}
