import React from 'react';
import { Card, Button, Icon, Check, TopBar, RoundButton, IconTile } from '../components/ui.jsx';
import { fmt, openTelegramLink } from '../tg.js';

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Good night!';
  if (h < 12) return 'Good morning!';
  if (h < 18) return 'Good afternoon!';
  return 'Good evening!';
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

      <Card>
        <div className="row">
          <IconTile name="flame" />
          <div className="grow">
            <h3>Daily Streak</h3>
            <p className="muted">{streak.count} {streak.count === 1 ? 'day' : 'days'} in a row</p>
          </div>
        </div>
        <Button
          className="wide mt"
          disabled={streak.checkedToday}
          busy={ctx.busy === 'checkin'}
          onClick={ctx.checkin}
        >
          {streak.checkedToday ? 'Checked in · come back tomorrow' : `Check in · +${streak.nextReward} pts`}
        </Button>
      </Card>

      <Card>
        <h3>Check-in rewards</h3>
        <div className="days">
          {days.map((d) => (
            <div key={d.day} className={`day ${d.done ? 'done' : ''} ${d.next ? 'next' : ''}`}>
              <span>Day {d.day}</span>
              {d.done ? <Check size={20} /> : <b>+{d.reward}</b>}
            </div>
          ))}
        </div>
        <p className="muted small mt-s">Check in every day to keep your streak. Miss a day and it starts over from Day 1.</p>
      </Card>
    </>
  );
}
