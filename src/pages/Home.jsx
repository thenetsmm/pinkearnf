import React, { useState } from 'react';
import { Button, Icon, Check, TopBar, RoundButton } from '../components/ui.jsx';
import { fmt, openTelegramLink } from '../tg.js';
import { useCountdown, mmss } from '../hooks.js';
import * as IMG from '../gameAssets.js';

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Good night!';
  if (h < 12) return 'Good morning!';
  if (h < 18) return 'Good afternoon!';
  return 'Good evening!';
}

function PiggyCard({ me, ctx }) {
  const p = me.piggy;
  const left = useCountdown(p.remainingSec);
  const ready = left <= 0;
  const pct = Math.min(100, Math.round(((p.cycleSec - left) / p.cycleSec) * 100));
  return (
    <section className="card piggy">
      <div className="row">
        <img className="pg-img" src={IMG.piggy} alt="" draggable="false" />
        <div className="grow">
          <h3>Piggy Bank</h3>
          <p className="muted nowrap">Auto mining • {Math.round(p.cycleSec / 60)}m cycle</p>
        </div>
        <div className={`pg-time ${ready ? 'full' : ''}`}>{ready ? 'Full!' : `⏳ ${mmss(left)}`}</div>
      </div>
      <div className="pg-bar"><i style={{ width: `${pct}%` }} /></div>
      <div className="pg-btns">
        <button type="button" className="pg-btn plain" disabled={!ready || !!ctx.busy} onClick={ctx.piggyClaim}>
          <b>Claim +{p.base} pts</b>
          <small>No ad</small>
        </button>
        <button type="button" className="pg-btn pink" disabled={!ready || !!ctx.busy} onClick={ctx.piggyDouble}>
          <b>{ctx.busy === 'piggy2x' ? 'Loading…' : `🎬 Claim +${p.boosted} pts`}</b>
          <small>2x Bonus • Watch ad</small>
        </button>
      </div>
    </section>
  );
}

function PromoCard({ me, ctx }) {
  const [code, setCode] = useState('');
  const submit = async () => {
    const c = code.trim();
    if (!c) return ctx.notify('Enter a promo code first', 'error');
    const ok = await ctx.redeemPromo(c);
    if (ok) setCode('');
  };
  return (
    <section className="card promo">
      <div className="row">
        <img className="pm-img" src={IMG.gift} alt="" draggable="false" />
        <div className="grow">
          <h3>Promo Code</h3>
          <p className="muted">Enter secret code for bonus pts</p>
        </div>
      </div>
      <div className="promo-row">
        <input
          className="input"
          placeholder="Enter code..."
          value={code}
          maxLength={32}
          autoCapitalize="characters"
          autoCorrect="off"
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <Button size="sm" busy={ctx.busy === 'promo'} onClick={submit}>Redeem</Button>
      </div>
      <p className="muted small mt-s">
        Daily codes are posted in our official channel{me.channel ? ` · @${me.channel.username}` : ''}
      </p>
    </section>
  );
}

function ChannelBanner({ me, ctx }) {
  const ch = me.channel;
  const [opened, setOpened] = useState(false);
  if (!ch || ch.claimed) return null;
  const click = () => {
    if (!opened) {
      openTelegramLink(ch.link);
      setOpened(true);
    } else ctx.claimChannel();
  };
  return (
    <section className="card channel">
      <img className="ch-img" src={IMG.megaphone} alt="" draggable="false" />
      <div className="grow">
        <h3>Join {me.config.appName} Official Channel</h3>
        <p className="muted small">Get daily promo codes &amp; payment proofs!</p>
      </div>
      <Button size="sm" busy={ctx.busy === 'channel'} onClick={click}>{opened ? `Claim +${ch.reward}` : `Join +${ch.reward} pts`}</Button>
    </section>
  );
}

export default function Home({ me, ctx }) {
  const { streak } = me;
  const days = streak.rewards.map((reward, i) => {
    const day = i + 1;
    return { day, reward, done: day <= streak.checkedDays, next: day === streak.nextDay };
  });

  return (
    <>
      <TopBar
        title={me.config.appName}
        left={<RoundButton icon="telegram-plane" label="Support" onClick={() => openTelegramLink(`https://t.me/${me.config.supportUsername}`)} />}
        right={<RoundButton icon="bell" tone="peach" label="Activity" onClick={() => ctx.openHistory()} />}
      />
      <h2 className="greeting">{greeting()}</h2>

      <section className="balance-card">
        <p className="bc-label">Your Balance</p>
        <p className="bc-amount">
          {fmt(me.balance)} <span>pts</span>
        </p>
        <button type="button" className="btn btn-white" onClick={ctx.openWithdraw}>Withdraw</button>
      </section>

      <section className="card">
        <div className="streak-head">
          <img className="st-img" src={IMG.flameTile} alt="" draggable="false" />
          <div className="grow">
            <h3>Daily Check-in</h3>
            <p className="muted nowrap">🔥 {streak.count}-day streak</p>
          </div>
          {streak.checkedToday ? (
            <span className="checked-chip">✓ Checked in</span>
          ) : (
            <Button size="sm" busy={ctx.busy === 'checkin'} onClick={ctx.checkin}>Check in +{streak.nextReward}</Button>
          )}
        </div>
        <div className="days">
          {days.map((d) => (
            <div key={d.day} className={`day ${d.done ? 'done' : ''} ${d.next ? 'next' : ''}`}>
              <span>Day {d.day}</span>
              {d.done ? <Check size={20} /> : <b>+{d.reward}</b>}
            </div>
          ))}
        </div>
        <p className="muted small mt-s">Check in every day to keep your streak. Miss a day and it starts over from Day 1.</p>
      </section>

      <PiggyCard me={me} ctx={ctx} />
      <PromoCard me={me} ctx={ctx} />
      <ChannelBanner me={me} ctx={ctx} />
      <button type="button" className="card nav-row" onClick={ctx.openProofs}>
        <div className="tile">✅</div>
        <div className="grow left">
          <h3>Payment Proofs</h3>
          <p className="muted small">See real payouts sent to users</p>
        </div>
        <Icon name="arrow-right" size={20} />
      </button>
    </>
  );
}
