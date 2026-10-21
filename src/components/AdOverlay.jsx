import React, { useEffect, useState } from 'react';
import { Button } from './ui.jsx';

/**
 * Full-screen countdown used for link offers and demo ads.
 * (Real video ads come from AdsGram's SDK and draw their own full-screen player.)
 */
export default function AdOverlay({ title, seconds, reward, isLink, onDone }) {
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    if (left <= 0) return undefined;
    const t = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  const pct = ((seconds - left) / seconds) * 100;
  const done = left <= 0;
  const R = 54;
  const C = 2 * Math.PI * R;

  return (
    <div className="ad-overlay" role="dialog" aria-modal="true">
      <div className="ad-box">
        <p className="ad-tag">{isLink ? 'Sponsored link' : 'Demo ad'}</p>
        <h2>{title}</h2>

        <div className="ring">
          <svg viewBox="0 0 120 120" width="150" height="150">
            <circle cx="60" cy="60" r={R} fill="none" stroke="#f9dce8" strokeWidth="9" />
            <circle
              cx="60" cy="60" r={R} fill="none" stroke="#e94283" strokeWidth="9" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C - (C * pct) / 100}
              transform="rotate(-90 60 60)" style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <span className="ring-num">{done ? '✓' : left}</span>
        </div>

        <p className="ad-hint">
          {done ? 'Done! Collect your reward.' : isLink ? 'Keep the page open until the timer ends.' : 'Please wait until the timer ends.'}
        </p>

        <Button disabled={!done} onClick={() => onDone(true)} className="wide">
          {done ? (reward ? `Claim +${reward} pts` : 'Continue') : `Wait ${left}s`}
        </Button>
        <button type="button" className="link-btn" onClick={() => onDone(false)}>Cancel</button>
      </div>
    </div>
  );
}
