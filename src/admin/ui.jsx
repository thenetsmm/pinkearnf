import React, { useState } from 'react';

export const Chips = ({ items, value, onChange }) => (
  <div className="ad-chips">
    {items.map(([id, label]) => (
      <button key={id} type="button" className={`ad-chip ${value === id ? 'on' : ''}`} onClick={() => onChange(id)}>{label}</button>
    ))}
  </div>
);

export const Section = ({ title, badge, tone = '', children }) => (
  <section className="ad-card">
    <div className="ad-card-head">
      <h3>{title}</h3>
      {badge && <span className={`ad-badge ${tone}`}>{badge}</span>}
    </div>
    {children}
  </section>
);

export const Row = ({ k, v, tone }) => (
  <div className="ad-row"><span>{k}</span><b className={tone}>{v}</b></div>
);

export const Note = ({ tone = 'warn', children }) => <div className={`ad-note ${tone}`}>{children}</div>;

export function Field({ label, value, onChange, type = 'text', suffix, placeholder, area, rows = 4 }) {
  return (
    <label className="ad-field">
      {label && <span>{label}</span>}
      <div className="ad-input">
        {area ? (
          <textarea rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        ) : (
          <input type={type} inputMode={type === 'number' ? 'decimal' : undefined} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        )}
        {suffix && <em>{suffix}</em>}
      </div>
    </label>
  );
}

export const Toggle = ({ label, hint, on, onChange }) => (
  <div className="ad-toggle">
    <div><b>{label}</b>{hint && <p>{hint}</p>}</div>
    <button type="button" className={`sw ${on ? 'on' : ''}`} onClick={() => onChange(!on)} aria-pressed={on}><i /></button>
  </div>
);

export function Btn({ children, tone = 'pink', onClick, busy, disabled, className = '' }) {
  const [wait, setWait] = useState(false);
  const click = async () => {
    if (wait || busy || disabled) return;
    setWait(true);
    try {
      await onClick();
    } finally {
      setWait(false);
    }
  };
  return (
    <button type="button" className={`ad-btn ${tone} ${className}`} disabled={disabled || busy || wait} onClick={click}>
      {busy || wait ? '…' : children}
    </button>
  );
}

export const Empty = ({ children }) => <p className="ad-empty">{children}</p>;
export const when = (d) => new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
export const num = (n) => Number(n || 0).toLocaleString('en-US');
