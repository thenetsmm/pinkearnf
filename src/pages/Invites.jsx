import React, { useEffect, useState } from 'react';
import { Card, Button, Chip, Icon, TopBar, RoundButton, Empty, Sheet } from '../components/ui.jsx';
import { api } from '../api.js';
import { copyText, shareInvite, openTelegramLink, haptic } from '../tg.js';

export default function Invites({ me, ctx }) {
  const r = me.referral;
  const [friends, setFriends] = useState(null);
  const [list, setList] = useState(null); // 'active' | 'pending'

  useEffect(() => {
    let alive = true;
    api('/api/referrals')
      .then((d) => alive && setFriends(d.friends))
      .catch(() => alive && setFriends([]));
    return () => {
      alive = false;
    };
  }, [r.total]);

  const copy = async () => {
    const ok = await copyText(r.link);
    haptic('light');
    ctx.notify(ok ? 'Link copied' : 'Could not copy - long press the link', ok ? 'success' : 'error');
  };
  const pct = Math.round(r.commissionRate * 100);

  return (
    <>
      <TopBar
        title={me.config.appName}
        left={<RoundButton icon="telegram-plane" label="Support" onClick={() => openTelegramLink(`https://t.me/${me.config.supportUsername}`)} />}
        right={<button type="button" className="plain-icon" aria-label="Share" onClick={() => shareInvite(r.link, me.config.appName)}><Icon name="share" size={24} /></button>}
      />
      <h1 className="page-title">Invite Friends</h1>

      <Card className="hero">
        <img src="/assets/friends-gift-invite.png" alt="" className="hero-img" />
        <div>
          <h3>Invite friends &amp; earn more</h3>
          <span className="chip chip-pink big">+{r.activationBonus} pts</span>
          <p className="muted small">Unlocked after your friend watches {r.activationAds} ads</p>
        </div>
      </Card>

      <Card className="task">
        <div className="tile flat"><Icon name="coins" size={26} /></div>
        <div className="grow">
          <p className="task-title">Lifetime commission</p>
          <p className="muted small">Earn {pct}% (about {r.commissionExample} pt) every time your friend watches an ad</p>
        </div>
      </Card>

      <h2 className="section-title">How it works</h2>
      <ol className="steps">
        <li><span className="step-ic"><Icon name="user-plus" size={20} /></span> 1. Friend joins</li>
        <li><span className="step-ic"><Icon name="video" size={20} /></span> 2. Watches {r.activationAds} ads</li>
        <li><span className="step-ic"><Icon name="coins" size={20} /></span> 3. {r.activationBonus} pts unlocked</li>
      </ol>

      <Card>
        <h3>Referral Link</h3>
        <div className="linkbox">
          <span className="link-text">{r.link.replace('https://', '')}</span>
          <button type="button" className="copy" onClick={copy}><Icon name="copy" size={18} /> Copy</button>
        </div>
        <Button className="wide mt" onClick={() => shareInvite(r.link, me.config.appName)}>Share invite</Button>
      </Card>

      <h2 className="section-title">My Referrals</h2>
      <div className="pills">
        <button type="button" className="pill gray" onClick={() => setList('active')}>{r.active} active ›</button>
        <button type="button" className="pill peach" onClick={() => setList('pending')}>{r.pending} pending ›</button>
      </div>

      {friends === null ? null : friends.length === 0 ? (
        <Empty>No friends yet. Share your link to get started!</Empty>
      ) : (
        <Card className="list">
          {friends.map((f, i) => (
            <div className="list-row" key={i}>
              <div className="avatar-s">{(f.name || '?').slice(0, 1).toUpperCase()}</div>
              <div className="grow">
                <b>{f.name}</b>
                <p className="muted small">{f.active ? `Active · earned you ${f.earned} pts` : `${Math.min(f.adsWatched, r.activationAds)}/${r.activationAds} ads watched`}</p>
              </div>
              <Chip tone={f.active ? 'green' : 'peach'}>{f.active ? 'Active' : 'Pending'}</Chip>
            </div>
          ))}
        </Card>
      )}
    
      {list && (
        <Sheet title={list === 'active' ? 'Active friends' : 'Pending friends'} onClose={() => setList(null)}>
          <p className="muted small">
            {list === 'active'
              ? `These friends watched ${r.activationAds}+ ads and unlocked your bonus.`
              : `These friends have not watched ${r.activationAds} ads yet.`}
          </p>
          {(friends || []).filter((f) => f.active === (list === 'active')).length === 0 ? (
            <Empty>{list === 'active' ? 'No active friends yet.' : 'No pending friends.'}</Empty>
          ) : (
            <div className="list">
              {(friends || []).filter((f) => f.active === (list === 'active')).map((f, i) => (
                <div className="list-row" key={i}>
                  <div className="avatar-s">{(f.name || '?').slice(0, 1).toUpperCase()}</div>
                  <div className="grow">
                    <b>{f.name}</b>
                    <p className="muted small">{f.active ? `Earned you ${f.earned} pts in commission` : `${Math.min(f.adsWatched, r.activationAds)}/${r.activationAds} ads watched`}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Sheet>
      )}
    </>
  );
}
