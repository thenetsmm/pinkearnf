import React, { useEffect } from 'react';

/** Line icon from /assets/icons, recoloured through CSS mask so it follows `currentColor`. */
export function Icon({ name, size = 22, className = '' }) {
  return (
    <span
      className={`ic ${className}`}
      style={{ '--src': `url(/assets/icons/${name}.svg)`, width: size, height: size }}
      aria-hidden="true"
    />
  );
}

export const Check = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

export const Clock = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 5v5.2l3.6 2.1-.9 1.5L11 13V7h2Z" />
  </svg>
);

export function Chip({ children, tone = 'peach' }) {
  return <span className={`chip chip-${tone}`}>{children}</span>;
}

export function Button({ children, variant = 'primary', size = 'md', disabled, onClick, className = '', busy }) {
  return (
    <button
      type="button"
      className={`btn btn-${variant} btn-${size} ${className}`}
      disabled={disabled || busy}
      onClick={onClick}
    >
      {busy ? <span className="spinner" /> : children}
    </button>
  );
}

export function Card({ children, className = '', ...rest }) {
  return (
    <section className={`card ${className}`} {...rest}>
      {children}
    </section>
  );
}

export function TopBar({ title = 'PinkEarn', left, right }) {
  return (
    <header className="topbar">
      <div className="topbar-side">{left}</div>
      <h1 className="topbar-title">{title}</h1>
      <div className="topbar-side right">{right}</div>
    </header>
  );
}

export function RoundButton({ icon, tone = 'lilac', label, onClick }) {
  return (
    <button type="button" className={`round round-${tone}`} aria-label={label} onClick={onClick}>
      <Icon name={icon} size={20} />
    </button>
  );
}

export function IconTile({ name }) {
  return (
    <div className="tile">
      <Icon name={name} size={26} />
    </div>
  );
}

export function Sheet({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="sheet-wrap" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grab" />
        <div className="sheet-head">
          <h2>{title}</h2>
          <button type="button" className="sheet-x" onClick={onClose} aria-label="Close">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`toast toast-${toast.type}`} role="status" key={toast.id}>
      {toast.text}
    </div>
  );
}

export function Empty({ children }) {
  return <p className="empty">{children}</p>;
}
