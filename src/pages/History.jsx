import React, { useEffect, useState } from 'react';
import { Card, Icon, Empty } from '../components/ui.jsx';
import { api } from '../api.js';
import { fmt } from '../tg.js';

const STATUS = { success: 'Success', pending: 'Pending', rejected: 'Rejected' };
const date = (d) =>
  new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function History({ onBack }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/history').then(setData).catch((e) => setError(e.message));
  }, []);

  return (
    <>
      <div className="profile-head">
        <button type="button" className="back" onClick={onBack}>
          <Icon name="arrow-right" size={20} className="flip" /> Back
        </button>
      </div>
      <h1 className="page-title">History</h1>

      {error && <Empty>{error}</Empty>}
      {!data && !error && <Empty>Loading…</Empty>}

      {data && (
        <>
          <div className="stats big">
            <div><span className="muted small">Ads watched</span><b>{fmt(data.adsWatched)}</b></div>
            <div><span className="muted small">Total earned</span><b>{fmt(data.totalEarned)} pts</b></div>
          </div>

          <h2 className="section-title">Withdrawals</h2>
          {data.withdrawals.length === 0 ? (
            <Empty>No withdrawals yet.</Empty>
          ) : (
            <Card className="list">
              {data.withdrawals.map((w) => (
                <div className="list-row" key={w.id}>
                  <div className="grow">
                    <b>{fmt(w.amountKs)} Ks · {w.method}</b>
                    <p className="muted small">{date(w.createdAt)}</p>
                    {w.status === 'rejected' && w.reason && <p className="reject-reason">Reason: {w.reason}</p>}
                  </div>
                  <span className={`st st-${w.status}`}>{STATUS[w.status]}</span>
                </div>
              ))}
            </Card>
          )}

          <h2 className="section-title">Recent activity</h2>
          {data.transactions.length === 0 ? (
            <Empty>Nothing yet - watch an ad to get started!</Empty>
          ) : (
            <Card className="list">
              {data.transactions.map((t) => (
                <div className="list-row" key={t.id}>
                  <div className="grow">
                    <b>{t.note || t.type}</b>
                    <p className="muted small">{date(t.createdAt)}</p>
                  </div>
                  <span className={t.amount >= 0 ? 'plus' : 'minus'}>{t.amount >= 0 ? '+' : ''}{fmt(t.amount)}</span>
                </div>
              ))}
            </Card>
          )}
        </>
      )}
    </>
  );
}
