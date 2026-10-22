import React from 'react';
import { Card, Button, Chip, Icon, Clock, IconTile } from '../components/ui.jsx';
import { useCountdown, mmss } from '../hooks.js';

const hms = (s) => `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function Tasks({ me, ctx }) {
  const { daily, mainAd, offers } = me;
  const adsLeft = mainAd.remainingToday;
  const cd = useCountdown(mainAd.cooldownSec);
  const reset = useCountdown(mainAd.resetSec);
  const mainLabel = adsLeft <= 0 ? `⏳ Next ads in ${hms(reset)}` : cd > 0 ? `⏳ Wait ${mmss(cd)} for next ad` : 'Start Watching';

  return (
    <>
      <h1 className="page-title">Watch Ads</h1>
      <p className="muted lead">Earn points for every view</p>

      <section className="video-card">
        <div className="video-thumb">
          <span className="vt-chip left"><Clock size={15} /> {mainAd.seconds} sec</span>
          <span className="vt-chip right">+{mainAd.reward} pts</span>
          <span className="play-btn"><Icon name="play" size={30} /></span>
        </div>
        <div className="video-body">
          <Button className="wide" disabled={adsLeft <= 0 || cd > 0} busy={ctx.busy === 'ad:main'} onClick={() => ctx.watchAd({ title: 'Watch & earn' })}>
            {mainLabel}
          </Button>
          <p className="muted small center mt-s">{adsLeft} ads left today</p>
        </div>
      </section>

      <h2 className="section-title">Today&rsquo;s Offers</h2>
      <div className="stack">
        {offers.length === 0 && <p className="empty">No offers right now. Check back soon!</p>}
        {offers.map((o) => (
          <Card key={o.id} className="task">
            <IconTile name="play" />
            <div className="grow">
              <p className="task-title">{o.title}</p>
              <Chip>+{o.reward} pts</Chip>
            </div>
            <Button size="sm" disabled={o.remainingToday <= 0} busy={ctx.busy === `ad:${o.id}`} onClick={() => ctx.watchAd({ offerId: o.id, title: o.title, key: o.id })}>
              {o.remainingToday > 0 ? 'Start' : 'Done'}
            </Button>
          </Card>
        ))}
      </div>

      <h1 className="page-title mt-l">Daily Tasks</h1>
      <div className="stack">
        <Card className="task">
          <IconTile name="calendar-check" />
          <div className="grow">
            <p className="task-title">Daily check-in</p>
            <Chip>+{me.streak.nextReward ?? me.streak.rewards[Math.max(0, me.streak.count - 1)]} pts</Chip>
          </div>
          <Button size="sm" disabled={daily.checkin.claimed} busy={ctx.busy === 'checkin'} onClick={ctx.checkin}>
            {daily.checkin.claimed ? 'Claimed' : 'Claim'}
          </Button>
        </Card>

        <Card className="task">
          <IconTile name="video" />
          <div className="grow">
            <p className="task-title">Watch {daily.ads.target} ads</p>
            <div className="chips">
              <Chip>+{daily.ads.reward} pts</Chip>
              <Chip tone="gray">{daily.ads.count}/{daily.ads.target}</Chip>
            </div>
          </div>
          {daily.ads.claimed ? (
            <Button size="sm" disabled>Claimed</Button>
          ) : daily.ads.ready ? (
            <Button size="sm" busy={ctx.busy === 'tasks-ads'} onClick={ctx.claimAdsTask}>Claim +{daily.ads.reward}</Button>
          ) : (
            <Button size="sm" disabled={me.mainAd.cooldownSec < 0} busy={ctx.busy === 'ad:task'} onClick={() => ctx.watchAd({ title: 'Watch & earn', task: 'ads5' })}>Start</Button>
          )}
        </Card>

        <Card className="task">
          <IconTile name="users" />
          <div className="grow">
            <p className="task-title">Invite a friend</p>
            <Chip>+{daily.invite.reward} pts</Chip>
          </div>
          {daily.invite.claimed ? (
            <Button size="sm" disabled>Claimed</Button>
          ) : daily.invite.ready ? (
            <Button size="sm" busy={ctx.busy === 'tasks-invite'} onClick={ctx.claimInviteTask}>Claim</Button>
          ) : (
            <Button size="sm" onClick={() => ctx.go('invites')}>Invite</Button>
          )}
        </Card>
      </div>
    </>
  );
}
