import React, { useEffect, useRef, useState } from 'react';
import { adminApi, hasPin, setPin } from './adminApi.js';
import { Btn, Note } from './ui.jsx';
import Dashboard from './Dashboard.jsx';
import Payouts from './Payouts.jsx';
import Users from './Users.jsx';
import Content from './Content.jsx';
import Settings from './Settings.jsx';
import AiBot from './AiBot.jsx';

const TABS = [
  ['dash', '▦', 'Dashboard'],
  ['pay', '↗', 'Payouts'],
  ['users', '◎', 'Users'],
  ['content', '▤', 'Content'],
  ['ai', '🤖', 'AI'],
  ['settings', '⚙', 'Settings'],
];

function Gate({ me, onOpen }) {
  const [pin, setP] = useState('');
  const [err, setErr] = useState('');
  const ref = useRef();
  useEffect(() => ref.current?.focus(), []);

  const verify = async (value = pin) => {
    setErr('');
    setPin(value);
    try {
      await adminApi('/verify', { method: 'POST' });
      onOpen();
    } catch (e) {
      setPin('');
      setErr(e.message);
    }
  };
  const onChange = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 6);
    setP(d);
    if (d.length === 6) verify(d);
  };
  return (
    <>
      <p className="ad-eyebrow">Access & Security</p>
      <h1 className="ad-title">Admin Access</h1>
      <p className="ad-sub">Only the approved Telegram administrator can open this panel.</p>
      <section className="ad-card">
        <div className="ad-card-head"><h3>⚙️ Admin Panel</h3><span className="ad-badge good">RESTRICTED</span></div>
        <div className="ad-row"><span>Telegram ID</span><b>{me.user.telegramId}</b></div>
        <div className="ad-row"><span>ADMIN_IDS check</span><b className="good">✓ Matched</b></div>
      </section>
      <section className="ad-card">
        <div className="ad-card-head"><h3>Enter Secret PIN</h3><span className="ad-badge">6 digits</span></div>
        <div className="ad-pin" onClick={() => ref.current?.focus()}>
          {Array.from({ length: 6 }, (_, i) => <span key={i} className={i === pin.length ? 'cur' : ''}>{pin[i] ? '•' : ''}</span>)}
          <input ref={ref} type="password" inputMode="numeric" autoComplete="off" value={pin} onChange={(e) => onChange(e.target.value)} />
        </div>
        {err && <Note tone="bad">{err}</Note>}
        <Btn className="full" disabled={pin.length !== 6} onClick={() => verify()}>Verify & Open Admin</Btn>
        <p className="ad-hint center">The PIN lives only in the server environment (ADMIN_PIN) — it is never stored in the app code.</p>
      </section>
    </>
  );
}

export default function Admin({ me, notify, onExit }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('dash');
  const [checking, setChecking] = useState(hasPin());

  // a PIN kept from earlier in this session is re-checked silently
  useEffect(() => {
    if (!hasPin()) return;
    adminApi('/verify', { method: 'POST' })
      .then(() => setOpen(true))
      .catch(() => setPin(''))
      .finally(() => setChecking(false));
  }, []);

  const lock = () => {
    setPin('');
    setOpen(false);
  };
  const header = (
    <header className="ad-head">
      <div className="ad-logo">S</div>
      <div className="grow"><b>{me.config.appName}</b><small>ADMIN CONSOLE</small></div>
      <span className="ad-secure">✓ SECURE</span>
      <button type="button" className="ad-exit" onClick={open ? lock : onExit} aria-label="Close admin">{open ? '🔒' : '✕'}</button>
    </header>
  );

  return (
    <div className="admin">
      {header}
      <main className="ad-main">
        {checking ? <p className="ad-empty">Checking…</p> : !open ? <Gate me={me} onOpen={() => setOpen(true)} /> : (
          <>
            {tab === 'dash' && <Dashboard notify={notify} />}
            {tab === 'pay' && <Payouts me={me} notify={notify} />}
            {tab === 'users' && <Users notify={notify} />}
            {tab === 'content' && <Content notify={notify} />}
            {tab === 'ai' && <AiBot notify={notify} />}
            {tab === 'settings' && <Settings notify={notify} />}
          </>
        )}
      </main>
      {open && (
        <nav className="ad-nav">
          {TABS.map(([id, ic, label]) => (
            <button key={id} type="button" className={tab === id ? 'on' : ''} onClick={() => { setTab(id); window.scrollTo({ top: 0 }); }}>
              <span>{ic}</span>{label}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
