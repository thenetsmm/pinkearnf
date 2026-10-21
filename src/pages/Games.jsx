import React, { useEffect, useState } from 'react';
import { Icon } from '../components/ui.jsx';
import { LeaderRow, LeaderboardSheet } from '../components/Leaderboard.jsx';
import { api } from '../api.js';
import { useCountdown, mmss } from '../hooks.js';
import { haptic } from '../tg.js';
import * as IMG from '../gameAssets.js';

function GameCard({ image, blend, title, lines, accent, button, onClick, muted }) {
  return (
    <section className="card game-card">
      <img src={image} alt="" className={`game-img ${blend ? 'blend' : ''}`} draggable="false" />
      <div className="game-body">
        <h3>{title}</h3>
        {lines.map((l) => (
          <p key={l} className="muted small">{l}</p>
        ))}
        {accent && <p className="accent small">{accent}</p>}
        <button type="button" className={`btn btn-primary btn-md wide ${muted ? 'is-muted' : ''}`} onClick={onClick}>{button}</button>
      </div>
    </section>
  );
}

export default function Games({ me, ctx }) {
  const g = me.games;
  const [lb, setLb] = useState(null);
  const [showTop, setShowTop] = useState(false);
  const spinCd = useCountdown(g.spin.cooldownSec);
  const scratchCd = useCountdown(g.scratch.cooldownSec);
  const ptsPerKs = me.withdraw.ptsPerKs;

  useEffect(() => {
    let alive = true;
    api('/api/games/leaderboard')
      .then((d) => alive && setLb(d))
      .catch(() => alive && setLb({ top: [], me: { rank: null, points: 0 } }));
    return () => {
      alive = false;
    };
  }, [me.balance]);

  const cd = g.cooldownMinutes;
  const spinFree = g.spin.left > 0;
  const scratchFree = g.scratch.left > 0;

  const openMystery = () => {
    if (me.balance < g.mystery.cost) {
      haptic('error');
      ctx.notify(`Not enough points. You need ${g.mystery.cost} pts to open a box.`, 'error');
      return;
    }
    ctx.openGame('mystery');
  };

  return (
    <>
      <header className="games-head">
        <h1 className="brand">{me.config.appName}</h1>
        <button type="button" className="round round-peach" aria-label="Leaderboard" onClick={() => setShowTop(true)}>
          <Icon name="trophy" size={22} />
        </button>
      </header>

      <div className="between games-title">
        <h2 className="page-title">Games</h2>
        <span className="rate-chip">1 Point = {1 / ptsPerKs} Ks</span>
      </div>

      <section className="card">
        <div className="lb-head">
          <div className="tile flat"><Icon name="leaderboard" size={26} /></div>
          <div className="grow">
            <h3>Daily Leaderboard</h3>
            <p className="muted small">Today&rsquo;s Top Earners</p>
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowTop(true)}>View Top 10</button>
        </div>
        <div className="lb-list mt-s">
          {lb && lb.top.length === 0 && <p className="empty">No earners yet today. Be the first!</p>}
          {lb && lb.top.slice(0, 3).map((r) => <LeaderRow key={r.rank} row={r} />)}
        </div>
      </section>

      <h2 className="section-title">Play &amp; Earn</h2>

      <GameCard
        image={IMG.wheel}
        title="Lucky Spin"
        lines={['Watch 1 ad • 1 spin', `${g.spin.limit} spins/day • ${cd}-min cooldown`]}
        accent={spinFree ? `${g.spin.left}/${g.spin.limit} spins left` : `Free spins used • Spin Again costs ${g.spin.paidCost} pts`}
        button={spinFree ? (spinCd > 0 ? `⏳ Next spin in ${mmss(spinCd)}` : 'Spin') : `Spin Again (${g.spin.paidCost} pts)`}
        muted={spinFree && spinCd > 0}
        onClick={() => ctx.openGame('spin')}
      />

      <GameCard
        image={IMG.scratchArt}
        blend
        title="Scratch Card"
        lines={['Watch 1 ad • 1 card', `${g.scratch.limit} cards/day • ${cd}-min cooldown`]}
        accent={scratchFree ? `${g.scratch.left}/${g.scratch.limit} cards left • Win ${g.scratch.min}–${g.scratch.max} pts` : 'No cards left • Come back tomorrow'}
        button={scratchFree ? (scratchCd > 0 ? `⏳ Next card in ${mmss(scratchCd)}` : 'Scratch') : 'Come back tomorrow'}
        muted={!scratchFree || scratchCd > 0}
        onClick={() => ctx.openGame('scratch')}
      />

      <GameCard
        image={IMG.mysteryArt}
        blend
        title="Mystery Box"
        lines={[`Cost: ${g.mystery.cost} pts • Win ${Math.min(...g.mystery.prizes)}–${Math.max(...g.mystery.prizes)} pts`, 'No ad • No cooldown']}
        button="Choose a Box"
        muted={me.balance < g.mystery.cost}
        onClick={openMystery}
      />

      {showTop && <LeaderboardSheet data={lb} onClose={() => setShowTop(false)} />}
    </>
  );
}
