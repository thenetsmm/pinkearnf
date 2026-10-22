import React, { useEffect, useRef, useState } from 'react';
import { api, postRetry } from '../api.js';
import { haptic, fmt } from '../tg.js';
import { useCountdown, mmss } from '../hooks.js';
import * as IMG from '../gameAssets.js';
import { sfx } from '../sfx.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Keeps a "still mounted" flag so async animations never touch a closed pop-up. */
function useAlive() {
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  return alive;
}

export function GameModal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="gm-wrap" onClick={onClose}>
      <div className="gm" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="gm-x" onClick={onClose} aria-label="Close">×</button>
        <h2 className="gm-title">{title}</h2>
        {children}
      </div>
    </div>
  );
}

const Confetti = () => <img className="confetti" src={IMG.confetti} alt="" draggable="false" />;

function Result({ prize, onClose, extra }) {
  if (prize > 0) {
    return (
      <div className="gm-result win">
        <Confetti />
        <h3>Congratulations!</h3>
        <p className="gm-prize">You won <b>{prize} pts</b></p>
        {extra}
        <button type="button" className="btn btn-primary btn-md wide" onClick={onClose}>Claim</button>
      </div>
    );
  }
  return (
    <div className="gm-result lose">
      <h3>Oops!</h3>
      <p className="gm-prize">Better luck next time!</p>
      {extra}
      <button type="button" className="btn btn-primary btn-md wide" onClick={onClose}>Close</button>
    </div>
  );
}

/* --------------------------------- Lucky Spin --------------------------------- */
export function SpinModal({ me, ctx, onClose }) {
  const g = me.games.spin;
  const alive = useAlive();
  const [info, setInfo] = useState({ left: g.left, cooldownSec: g.cooldownSec });
  const [bal, setBal] = useState(me.balance);
  const [phase, setPhase] = useState('idle'); // idle | loading | spinning | result
  const wheelRef = useRef(null);
  const rotRef = useRef(0);
  const [prize, setPrize] = useState(0);
  const cd = useCountdown(info.cooldownSec);
  const free = info.left > 0;

  async function play() {
    if (phase !== 'idle') return;
    if (free && cd > 0) return;
    if (!free && bal < g.paidCost) {
      haptic('error');
      ctx.notify(`Not enough points. You need ${g.paidCost} pts to spin again.`, 'error');
      return;
    }
    setPhase('loading');
    try {
      let r;
      if (free) {
        const sessionId = await ctx.runGameAd('spin');
        if (!sessionId) return alive.current && setPhase('idle');
        r = await postRetry('/api/games/spin/play', { sessionId });
      } else {
        r = await api('/api/games/spin/play', { method: 'POST', body: { paid: true } });
      }
      if (!alive.current) return ctx.refresh();

      // spin for ~5.5 s with a long, smooth slow-down (ticks follow the wheel's speed)
      const D = 5500;
      const target = rotRef.current - (rotRef.current % 360) + 360 * 7 + (360 - 60 * r.index) + (Math.random() * 30 - 15);
      const el = wheelRef.current;
      const from = rotRef.current;
      // Web Animations API: runs even where CSS transitions are switched off (Reduce Motion etc.)
      el.animate([{ transform: `rotate(${from}deg)` }, { transform: `rotate(${target}deg)` }], {
        duration: D,
        easing: 'cubic-bezier(.17,.6,.1,1)',
        fill: 'forwards',
      });
      el.style.transform = `rotate(${target}deg)`;
      rotRef.current = target;
      setPhase('spinning');
      const t0 = Date.now();
      while (alive.current && Date.now() - t0 < D - 150) {
        const p = (Date.now() - t0) / D;
        sfx.tick();
        haptic('light');
        await wait(55 + 420 * p * p * p); // fast at the start, slower and slower at the end
      }
      await wait(Math.max(0, D - (Date.now() - t0)) + 250);
      setBal(r.balance);
      setPrize(r.prize);
      if (r.paid) setInfo((s) => ({ ...s }));
      else setInfo({ left: r.left, cooldownSec: r.cooldownSec });
      ctx.refresh();
      if (!alive.current) return;
      haptic(r.prize > 0 ? 'success' : 'warning');
      if (r.prize > 0) sfx.tada();
      else sfx.lose();
      setPhase('result');
    } catch (e) {
      haptic('error');
      ctx.notify(e.message, 'error');
      ctx.refresh();
      if (alive.current) setPhase('idle');
    }
  }

  const label = phase === 'loading'
    ? 'Loading…'
    : free
      ? (cd > 0 ? `⏳ Next spin in ${mmss(cd)}` : 'Watch Ad to Spin')
      : `Spin Again (Cost: ${g.paidCost} pts)`;

  return (
    <GameModal title="Lucky Spin" onClose={onClose}>
      <div className="wheel-box">
        <div className="wheel-pointer" />
        <img
          className="wheel"
          src={IMG.wheel}
          alt=""
          draggable="false"
          ref={wheelRef}
        />
        <div className="wheel-hub" />
      </div>

      {phase === 'result' ? (
        <Result prize={prize} onClose={onClose} />
      ) : (
        <>
          <button
            type="button"
            className={`btn btn-primary btn-md wide ${free && cd > 0 ? 'is-muted' : ''}`}
            disabled={phase !== 'idle'}
            onClick={play}
          >
            {phase === 'spinning' ? 'Spinning…' : label}
          </button>
          <p className="gm-foot">
            {free
              ? `${info.left} spin${info.left === 1 ? '' : 's'} left today • ${me.games.cooldownMinutes}-min cooldown`
              : `Free spins used • Balance: ${fmt(bal)} pts`}
          </p>
        </>
      )}
    </GameModal>
  );
}

/* -------------------------------- Scratch Card -------------------------------- */
const CW = 600;
const CH = 380;

function ScratchCanvas({ onReveal, revealed }) {
  const ref = useRef(null);
  const st = useRef({ drawing: false, moves: 0, base: 0, done: false });

  useEffect(() => {
    const c = ref.current;
    const x = c.getContext('2d', { willReadFrequently: true });
    // solid silver first, so the card is NEVER see-through (even before the foil picture is decoded)
    const gr = x.createLinearGradient(0, 0, CW, CH);
    gr.addColorStop(0, '#d9d9e3');
    gr.addColorStop(1, '#a9a9bd');
    x.fillStyle = gr;
    x.fillRect(0, 0, CW, CH);
    st.current.base = sample().opaque;
    const img = new Image();
    img.onload = () => {
      x.globalCompositeOperation = 'source-over';
      x.drawImage(img, 0, 0, CW, CH);
      st.current.base = sample().opaque;
    };
    img.src = IMG.foil;

    function sample() {
      let opaque = 0;
      let clear = 0;
      const d = x.getImageData(0, 0, CW, CH).data;
      for (let py = 6; py < CH; py += 12) {
        for (let px = 6; px < CW; px += 12) {
          if (d[(py * CW + px) * 4 + 3] < 20) clear += 1;
          else opaque += 1;
        }
      }
      return { opaque, clear };
    }

    const pos = (e) => {
      const r = c.getBoundingClientRect();
      return [((e.clientX - r.left) / r.width) * CW, ((e.clientY - r.top) / r.height) * CH];
    };
    let last = null;
    const scratch = (e) => {
      if (!st.current.drawing || st.current.done) return;
      const [px, py] = pos(e);
      x.globalCompositeOperation = 'destination-out';
      x.lineWidth = 56;
      x.lineCap = 'round';
      x.beginPath();
      x.moveTo(...(last || [px, py]));
      x.lineTo(px, py);
      x.stroke();
      last = [px, py];
      st.current.moves += 1;
      if (st.current.moves % 3 === 0) sfx.scratch();
      // judge only after a real scratching gesture (a tap never reveals the prize)
      if (st.current.moves >= 12 && st.current.moves % 4 === 0 && st.current.base > 0) {
        const s = sample();
        const total = s.clear + s.opaque;
        // foil samples scratched away = clear now - samples that were already clear at the start
        const cleared = Math.max(0, s.clear - (total - st.current.base));
        if (cleared / st.current.base >= 0.5) {
          st.current.done = true;
          onReveal();
        }
      }
    };
    const down = (e) => {
      st.current.drawing = true;
      last = null;
      c.setPointerCapture?.(e.pointerId);
      scratch(e);
    };
    const up = () => {
      st.current.drawing = false;
      last = null;
    };
    c.addEventListener('pointerdown', down);
    c.addEventListener('pointermove', scratch);
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    return () => {
      c.removeEventListener('pointerdown', down);
      c.removeEventListener('pointermove', scratch);
      c.removeEventListener('pointerup', up);
      c.removeEventListener('pointercancel', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={ref} width={CW} height={CH} className={`scratch-foil ${revealed ? 'gone' : ''}`} />;
}

export function ScratchModal({ me, ctx, onClose }) {
  const g = me.games.scratch;
  const alive = useAlive();
  const [info, setInfo] = useState({ left: g.left, cooldownSec: g.cooldownSec });
  const [phase, setPhase] = useState('idle'); // idle | loading | card
  const [prize, setPrize] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const cd = useCountdown(info.cooldownSec);
  const free = info.left > 0;

  async function play() {
    if (phase !== 'idle' || !free || cd > 0) return;
    setPhase('loading');
    try {
      const sessionId = await ctx.runGameAd('scratch');
      if (!sessionId) return alive.current && setPhase('idle');
      const r = await postRetry('/api/games/scratch/play', { sessionId });
      setInfo({ left: r.left, cooldownSec: r.cooldownSec });
      setPrize(r.prize);
      ctx.refresh();
      if (alive.current) {
        setRevealed(false);
        setPhase('card');
      }
    } catch (e) {
      haptic('error');
      ctx.notify(e.message, 'error');
      ctx.refresh();
      if (alive.current) setPhase('idle');
    }
  }

  const onReveal = () => {
    setRevealed(true);
    haptic('success');
    sfx.win();
  };

  return (
    <GameModal title="Scratch Card" onClose={onClose}>
      {phase === 'card' ? (
        <>
          <div className="scratch-card">
            <div className="scratch-prize">
              <small>You won</small>
              <b>{prize} pts</b>
            </div>
            <ScratchCanvas onReveal={onReveal} revealed={revealed} />
            {!revealed && <span className="scratch-hint">Scratch here</span>}
            {revealed && <Confetti />}
          </div>
          <button type="button" className="btn btn-primary btn-md wide" disabled={!revealed} onClick={onClose}>
            {revealed ? `Claim ${prize} pts` : 'Scratch the card first'}
          </button>
          <p className="gm-foot">{info.left} card{info.left === 1 ? '' : 's'} left today</p>
        </>
      ) : (
        <>
          <img className="gm-art" src={IMG.scratchArt} alt="" draggable="false" />
          <p className="gm-sub">Win {g.min}–{g.max} pts on every card</p>
          <button
            type="button"
            className={`btn btn-primary btn-md wide ${!free || cd > 0 ? 'is-muted' : ''}`}
            disabled={phase !== 'idle' || !free || cd > 0}
            onClick={play}
          >
            {phase === 'loading' ? 'Loading…' : !free ? 'Come back tomorrow' : cd > 0 ? `⏳ Next card in ${mmss(cd)}` : 'Watch Ad to Scratch'}
          </button>
          <p className="gm-foot">
            {free ? `${info.left} card${info.left === 1 ? '' : 's'} left today • ${me.games.cooldownMinutes}-min cooldown` : 'No cards left today'}
          </p>
        </>
      )}
    </GameModal>
  );
}

/* --------------------------------- Mystery Box --------------------------------- */
export function MysteryModal({ me, ctx, onClose }) {
  const g = me.games.mystery;
  const alive = useAlive();
  const [bal, setBal] = useState(me.balance);
  const [phase, setPhase] = useState('idle'); // idle | loading | teaser | shuffle | pick | result
  const [order, setOrder] = useState([0, 1, 2]); // slot -> box id
  const [vals, setVals] = useState(g.prizes); // value of each box id while it is shown
  const [open, setOpen] = useState([false, false, false]);
  const [dim, setDim] = useState([false, false, false]);
  const [shake, setShake] = useState(false);
  const [res, setRes] = useState(null);
  const slotOf = (id) => order.indexOf(id);

  async function start() {
    if (phase !== 'idle' && phase !== 'result') return;
    if (bal < g.cost) {
      haptic('error');
      ctx.notify(`Insufficient balance. You need ${g.cost} pts.`, 'error');
      return;
    }
    setPhase('loading');
    setRes(null);
    setOpen([false, false, false]);
    setDim([false, false, false]);
    setOrder([0, 1, 2]);
    try {
      const r = await api('/api/games/mystery/play', { method: 'POST' });
      if (!alive.current) return ctx.refresh();
      setBal(r.balance);
      ctx.refresh();
      setRes(r);

      // teaser: show what is inside, then close
      setVals(g.prizes);
      setPhase('teaser');
      setOpen([true, true, true]);
      sfx.sparkle();
      await wait(1700);
      if (!alive.current) return;
      setOpen([false, false, false]);
      await wait(500);

      // shuffle
      setPhase('shuffle');
      let cur = [0, 1, 2];
      for (let i = 0; i < 9; i += 1) {
        const a = i % 3;
        const b = (a + 1 + (i % 2)) % 3;
        cur = [...cur];
        [cur[a], cur[b]] = [cur[b], cur[a]];
        if (!alive.current) return;
        setOrder(cur);
        sfx.whoosh();
        haptic('light');
        await wait(300);
      }
      if (alive.current) setPhase('pick');
    } catch (e) {
      haptic('error');
      ctx.notify(e.message, 'error');
      ctx.refresh();
      if (alive.current) setPhase('idle');
    }
  }

  async function pick(id) {
    if (phase !== 'pick' || !res) return;
    setPhase('reveal');
    sfx.pop();
    haptic('medium');
    setShake(true);
    await wait(650);
    if (!alive.current) return;
    setShake(false);
    const others = [...res.others];
    const v = [0, 1, 2].map((b) => (b === id ? res.prize : others.shift()));
    setVals(v);
    setOpen([0, 1, 2].map((b) => b === id));
    haptic(res.prize >= 50 ? 'success' : 'light');
    sfx.win();
    await wait(1000);
    if (!alive.current) return;
    setOpen([true, true, true]);
    setDim([0, 1, 2].map((b) => b !== id));
    await wait(500);
    if (alive.current) setPhase('result');
  }

  const hint = {
    idle: `Pick the right box! Cost: ${g.cost} pts`,
    loading: 'Getting your boxes ready…',
    teaser: 'Remember what is inside…',
    shuffle: 'Shuffling…',
    pick: 'Choose a box!',
    reveal: 'Opening…',
    result: '',
  }[phase];

  return (
    <GameModal title="Mystery Box" onClose={onClose}>
      <div className={`mbox-stage ${phase === 'result' ? 'done' : ''}`}>
        {[0, 1, 2].map((id) => (
          <button
            key={id}
            type="button"
            className={`mbox ${shake && phase === 'reveal' ? 'shake' : ''} ${dim[id] ? 'dim' : ''} ${phase === 'pick' ? 'pickable' : ''}`}
            style={{ left: `${slotOf(id) * 33.333}%` }}
            disabled={phase !== 'pick'}
            onClick={() => pick(id)}
            aria-label={`Box ${slotOf(id) + 1}`}
          >
            <img src={open[id] ? IMG.boxOpen : IMG.boxClosed} alt="" draggable="false" />
            {open[id] && <span className="mbox-val">{vals[id]}</span>}
          </button>
        ))}
      </div>

      {phase === 'result' && res ? (
        <div className={`gm-result ${res.prize >= 50 ? 'win' : ''}`}>
          {res.prize >= 50 && <Confetti />}
          <h3>{res.prize >= 50 ? 'JACKPOT!' : 'Box opened!'}</h3>
          <p className="gm-prize">You won <b>{res.prize} pts</b></p>
          <p className="muted small">Balance: {fmt(bal)} pts</p>
          <button type="button" className="btn btn-primary btn-md wide" onClick={onClose}>Claim</button>
          <button
            type="button"
            className={`btn btn-white btn-md wide gm-again ${bal < g.cost ? 'is-muted' : ''}`}
            onClick={start}
          >
            Play Again ({g.cost} pts)
          </button>
        </div>
      ) : (
        <>
          <p className="gm-sub">{hint}</p>
          {phase === 'idle' && (
            <button type="button" className="btn btn-primary btn-md wide" onClick={start}>
              Pay {g.cost} pts &amp; Play
            </button>
          )}
          <p className="gm-foot">Balance: {fmt(bal)} pts • Win {Math.min(...g.prizes)}–{Math.max(...g.prizes)} pts</p>
        </>
      )}
    </GameModal>
  );
}
