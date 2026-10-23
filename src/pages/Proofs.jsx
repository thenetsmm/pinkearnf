import React, { useEffect, useState } from 'react';
import { Card, Icon, Empty } from '../components/ui.jsx';
import { api } from '../api.js';
import { fmt, openTelegramLink } from '../tg.js';

const date = (d) => new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Public "proof of payments" page: every paid withdrawal, with names and numbers partly hidden. */
export default function Proofs({ onBack }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/api/proofs').then(setData).catch((e) => setError(e.message));
  }, []);

  return (
    <>
      <div className="profile-head">
        <button type="button" className="back" onClick={onBack}>
          <Icon name="arrow-right" size={20} className="flip" /> Back
        </button>
      </div>
      <h1 className="page-title">Payment Proofs</h1>
      <p className="muted lead">Real payouts sent to our users. Names and numbers are partly hidden for privacy.</p>
      {error && <Empty>{error}</Empty>}
      {!data && !error && <Empty>Loading…</Empty>}
      {data && (
        <>
          <div className="stats big">
            <div><span className="muted small">Payments sent</span><b>{fmt(data.total)}</b></div>
            <div><span className="muted small">Total paid</span><b>{fmt(data.totalKs)} Ks</b></div>
          </div>
          {data.channel && (
            <button type="button" className="card nav-row" onClick={() => openTelegramLink(`https://t.me/${data.channel}`)}>
              <div className="tile"><Icon name="telegram-plane" size={26} /></div>
              <div className="grow left"><h3>Payment channel</h3><p className="muted small">@{data.channel} · every payout is posted live</p></div>
              <Icon name="arrow-right" size={20} />
            </button>
          )}
          <h2 className="section-title">Latest payments</h2>
          {data.items.length === 0 ? (
            <Empty>No payments yet. The first paid withdrawal will appear here.</Empty>
          ) : (
            <Card className="list">
              {data.items.map((p) => (
                <div className="list-row" key={p.ref}>
                  <div className="grow">
                    <b>✅ {fmt(p.amountKs)} Ks · {p.method}</b>
                    <p className="muted small">{p.name} · {p.account} · {p.ref}</p>
                    <p className="muted small">{date(p.paidAt)}</p>
                  </div>
                  <span className="st st-success">Paid</span>
                </div>
              ))}
            </Card>
          )}
        </>
      )}
    </>
  );
}
