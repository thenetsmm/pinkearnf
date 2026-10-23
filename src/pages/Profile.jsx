import React, { useEffect, useState } from 'react';
import { Card, Button, Icon, TopBar } from '../components/ui.jsx';
import { api } from '../api.js';
import { copyText, fmt, openTelegramLink, haptic } from '../tg.js';

const STATUS = { success: 'Success', pending: 'Pending', rejected: 'Rejected' };

export default function Profile({ me, ctx }) {
  const { user, withdraw, referral } = me;
  const [hist, setHist] = useState(null);

  useEffect(() => {
    api('/api/history').then(setHist).catch(() => {});
  }, [me.balance]);

  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Telegram user';
  const min = withdraw.min * withdraw.ptsPerKs;
  const pct = Math.min(100, Math.round((me.balance / min) * 100));
  const ready = me.balance >= min;
  const lastW = hist?.withdrawals?.[0];

  const copy = async () => {
    const ok = await copyText(referral.link);
    haptic('light');
    ctx.notify(ok ? 'Link copied' : 'Could not copy - long press the link', ok ? 'success' : 'error');
  };

  return (
    <>
      <div className="profile-head">
        <h1 className="page-title">Profile</h1>
        <button type="button" className="plain-icon" aria-label="Settings" onClick={() => ctx.openSheet('settings')}>
          <Icon name="settings" size={26} />
        </button>
      </div>

      <div className="who">
        <div className="avatar">
          {user.photoUrl ? <img src={user.photoUrl} alt="" referrerPolicy="no-referrer" /> : <Icon name="user" size={46} />}
        </div>
        <div>
          <h2>{name}</h2>
          {user.username && <p className="muted">@{user.username}</p>}
          <p className="muted small">Telegram ID: {user.telegramId}</p>
        </div>
      </div>

      <section className="balance-card slim">
        <div>
          <p className="bc-label">My Balance</p>
          <p className="bc-amount">{fmt(me.balance)} <span>pts</span></p>
          <p className="bc-ks">{fmt(me.balanceKs)} Ks</p>
        </div>
        <span className="bc-coin"><Icon name="coins" size={30} /></span>
      </section>

      <Card>
        <div className="row">
          <div className="tile"><Icon name="wallet" size={26} /></div>
          <div>
            <h3>Withdraw</h3>
            <p className="muted small">Minimum payout {fmt(withdraw.min)} Ks</p>
          </div>
        </div>
        <div className="progress"><i style={{ width: `${pct}%` }} /></div>
        <div className="between small">
          <span>{fmt(Math.min(me.balanceKs, withdraw.min))} / {fmt(withdraw.min)} Ks</span>
          {ready ? <span className="ok">Ready to withdraw</span> : <span className="muted">{fmt(withdraw.min - me.balanceKs)} Ks to go</span>}
        </div>
        <Button className="wide mt" onClick={ctx.openWithdraw}>
          Withdraw
        </Button>
      </Card>

      <Card>
        <div className="row">
          <div className="tile"><Icon name="user-plus" size={26} /></div>
          <div className="grow minw">
            <h3>Referral Link</h3>
            <div className="linkbox sm">
              <span className="link-text">{referral.link.replace('https://', '')}</span>
              <button type="button" className="copy" onClick={copy}><Icon name="copy" size={18} /> Copy</button>
            </div>
          </div>
        </div>
        <div className="stats">
          <div><span className="muted small">Total referrals</span><b>{referral.total}</b></div>
          <div><span className="muted small">Bonus</span><b>{fmt(referral.bonus)} pts</b></div>
        </div>
        <Button className="wide" disabled={referral.bonus <= 0} busy={ctx.busy === 'claim-bonus'} onClick={ctx.claimBonus}>Claim Bonus</Button>
      </Card>

      <button type="button" className="card nav-row" onClick={ctx.openHistory}>
        <div className="tile"><Icon name="history" size={26} /></div>
        <div className="grow left">
          <h3>History</h3>
          <p className="muted small">
            Ads watched: {fmt(me.adsWatched)} | Withdrawals: {hist ? hist.withdrawals.length : '…'}
            {lastW && <span className={`st st-${lastW.status}`}> ({STATUS[lastW.status]})</span>}
          </p>
        </div>
        <Icon name="arrow-right" size={20} />
      </button>

      <button type="button" className="card nav-row" onClick={ctx.openProofs}>
        <div className="tile">✅</div>
        <div className="grow left">
          <h3>Payment Proofs</h3>
          <p className="muted small">Real payouts sent to users</p>
        </div>
        <Icon name="arrow-right" size={20} />
      </button>

      {me.isAdmin && (
        <button type="button" className="card nav-row" onClick={ctx.openAdmin}>
          <div className="tile">⚙️</div>
          <div className="grow left">
            <h3>⚙️ Admin Panel</h3>
            <p className="muted small">Restricted · PIN required</p>
          </div>
          <Icon name="arrow-right" size={20} />
        </button>
      )}

      <button type="button" className="card nav-row" onClick={() => openTelegramLink(`https://t.me/${me.config.supportUsername}`)}>
        <div className="tile"><Icon name="telegram-plane" size={26} /></div>
        <div className="grow left">
          <h3>Support</h3>
          <p className="muted small">@{me.config.supportUsername}</p>
        </div>
        <Icon name="arrow-right" size={20} />
      </button>
    </>
  );
}
