import React from 'react';
import { Sheet, Empty } from './ui.jsx';
import { fmt } from '../tg.js';

const COLORS = {
  1: ['#ffe08a', '#e8a21a'],
  2: ['#f1f1f7', '#a3a3b8'],
  3: ['#f0b383', '#b9672d'],
};

/** Drawn in SVG so it stays crisp on every screen. */
export function Medal({ rank }) {
  const [light, dark] = COLORS[rank] || ['#f6dfe8', '#d9a9bd'];
  const id = `m${rank}`;
  return (
    <svg className="medal" viewBox="0 0 40 52" width="38" height="50" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
      </defs>
      <path d="M9 30 3 50l9-4 5 5 3-18Z" fill="#e94283" />
      <path d="m31 30 6 20-9-4-5 5-3-18Z" fill="#f45b8b" />
      <circle cx="20" cy="19" r="16" fill={`url(#${id})`} stroke={dark} strokeWidth="1.5" />
      <circle cx="20" cy="19" r="11.5" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1.2" />
      <text x="20" y="25" textAnchor="middle" fontSize="17" fontWeight="800" fill="#fff" stroke={dark} strokeWidth=".6">{rank}</text>
    </svg>
  );
}

export function LeaderRow({ row }) {
  return (
    <div className={`lb-row ${row.me ? 'me' : ''}`}>
      {row.rank <= 3 ? <Medal rank={row.rank} /> : <span className="lb-rank">{row.rank}</span>}
      <span className="lb-name">{row.name}{row.me ? ' (You)' : ''}</span>
      <b className="lb-pts">{fmt(row.points)} pts</b>
    </div>
  );
}

export function LeaderboardSheet({ data, onClose }) {
  return (
    <Sheet title="Today's Top 10" onClose={onClose}>
      <p className="muted small">Points earned today · resets at midnight (Myanmar time)</p>
      <div className="lb-list">
        {!data && <Empty>Loading…</Empty>}
        {data && data.top.length === 0 && <Empty>No earners yet today. Be the first!</Empty>}
        {data && data.top.map((r) => <LeaderRow key={r.rank} row={r} />)}
      </div>
      {data && (
        <div className="lb-me">
          <span>Your rank</span>
          <b>{data.me.rank ? `#${data.me.rank}` : 'Not in top 200'} · {fmt(data.me.points)} pts</b>
        </div>
      )}
    </Sheet>
  );
}
