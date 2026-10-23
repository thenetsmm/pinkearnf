import React, { useEffect, useState } from 'react';
import { adminApi } from './adminApi.js';
import { Chips, Section, Row, Note, Empty, Btn, Field, Toggle } from './ui.jsx';

const s2 = (v) => (v === undefined || v === null ? '' : String(v));
const PRIZE_LABEL = { spin: ['5 pts', '10 pts', '15 pts', '25 pts', '100 pts · Jackpot', 'Try Again'], scratch: ['5 pts', '10 pts', '15 pts', '20 pts'], mystery: ['5 pts', '10 pts', '50 pts · Jackpot'] };

/** form state (strings) <-> server values (numbers, %, minutes) */
const toForm = (v) => ({
  mainAdReward: s2(v.mainAdReward), mainAdDailyLimit: s2(v.mainAdDailyLimit), mainAdCooldownMinutes: s2(v.mainAdCooldownMinutes),
  adsTaskReward: s2(v.adsTaskReward), adsTaskTarget: s2(v.adsTaskTarget),
  piggyMinutes: s2(Math.round((v.piggyCycleSeconds / 60) * 100) / 100), piggyBase: s2(v.piggyBase), piggyBoosted: s2(v.piggyBoosted),
  streak: v.streakRewards.map(s2),
  referralBonus: s2(v.referralBonus), referralActivationAds: s2(v.referralActivationAds), commissionPct: s2(Math.round(v.commissionRate * 1000) / 10),
  minWithdraw: s2(v.minWithdraw), adRevenueKs: s2(v.adRevenueKs),
  spinDailyLimit: s2(v.spinDailyLimit), scratchDailyLimit: s2(v.scratchDailyLimit), gameCooldownMinutes: s2(v.gameCooldownMinutes),
  spinPaidCost: s2(v.spinPaidCost), mysteryCost: s2(v.mysteryCost),
  odds: { spin: v.gameOdds.spin.map(s2), scratch: v.gameOdds.scratch.map(s2), mystery: v.gameOdds.mystery.map(s2) },
  adsgramBlockId: v.adsgramBlockId || '', onclickaSpotId: v.onclickaSpotId || '', richadsZoneId: v.richadsZoneId || '', adsterraLink: v.adsterraLink || '',
  partners: v.partnerLinks.map((x) => x || ''), redirectOnLimit: !!v.redirectOnLimit,
});
const toServer = (f) => ({
  mainAdReward: f.mainAdReward, mainAdDailyLimit: f.mainAdDailyLimit, mainAdCooldownMinutes: f.mainAdCooldownMinutes,
  adsTaskReward: f.adsTaskReward, adsTaskTarget: f.adsTaskTarget,
  piggyCycleSeconds: Math.round(Number(f.piggyMinutes) * 60), piggyBase: f.piggyBase, piggyBoosted: f.piggyBoosted,
  streakRewards: f.streak,
  referralBonus: f.referralBonus, referralActivationAds: f.referralActivationAds, commissionRate: Number(f.commissionPct) / 100,
  minWithdraw: f.minWithdraw, adRevenueKs: f.adRevenueKs,
  spinDailyLimit: f.spinDailyLimit, scratchDailyLimit: f.scratchDailyLimit, gameCooldownMinutes: f.gameCooldownMinutes,
  spinPaidCost: f.spinPaidCost, mysteryCost: f.mysteryCost,
  gameOdds: f.odds,
  adsgramBlockId: f.adsgramBlockId, onclickaSpotId: f.onclickaSpotId, richadsZoneId: f.richadsZoneId, adsterraLink: f.adsterraLink,
  partnerLinks: f.partners, redirectOnLimit: f.redirectOnLimit,
});

function Odds({ game, title, f, setOdd, prizes }) {
  const w = f.odds[game];
  const total = w.reduce((a, b) => a + (Number(b) || 0), 0);
  const ev = total ? w.reduce((a, b, i) => a + ((Number(b) || 0) / total) * prizes[game][i], 0) : 0;
  return (
    <Section title={title} badge={`Avg win ${ev.toFixed(1)} pts`}>
      {w.map((x, i) => (
        <div className="ad-odd" key={i}>
          <span>{PRIZE_LABEL[game][i]}</span>
          <input type="number" inputMode="decimal" value={x} onChange={(e) => setOdd(game, i, e.target.value)} />
          <em>{total ? Math.round(((Number(x) || 0) / total) * 1000) / 10 : 0}%</em>
        </div>
      ))}
      <Note tone={total > 0 ? 'good' : 'bad'}>Weights are relative (they do not have to add up to 100). Probabilities shown on the right.</Note>
    </Section>
  );
}

export default function Settings({ notify }) {
  const [tab, setTab] = useState('rates');
  const [f, setF] = useState(null);
  const [prizes, setPrizes] = useState(null);
  const [err, setErr] = useState('');

  const load = async () => {
    try {
      const r = await adminApi('/settings');
      setF(toForm(r.values));
      setPrizes(r.prizes);
    } catch (e) {
      setErr(e.message);
    }
  };
  useEffect(() => {
    load();
  }, []);

  if (err) return <Note tone="bad">{err}</Note>;
  if (!f) return <Empty>Loading…</Empty>;
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const setArr = (k, i) => (v) => setF((s) => ({ ...s, [k]: s[k].map((x, j) => (j === i ? v : x)) }));
  const setOdd = (g, i, v) => setF((s) => ({ ...s, odds: { ...s.odds, [g]: s.odds[g].map((x, j) => (j === i ? v : x)) } }));
  const save = async () => {
    try {
      await adminApi('/settings', { method: 'PUT', body: { values: toServer(f) } });
      notify('Settings saved · live in the app now', 'success');
      load();
    } catch (e) {
      notify(e.message, 'error');
    }
  };

  const heads = { rates: ['Dynamic App Settings', 'Edit reward rates and daily limits without redeploying.'], odds: ['Game Probabilities', 'Update reward weights, limits and cooldowns in one place.'], nets: ['Ad Networks & Cross-Promo', 'Change provider IDs and five partner links.'] }[tab];
  return (
    <>
      <p className="ad-eyebrow">ShadowEarn Admin</p>
      <h1 className="ad-title">{heads[0]}</h1>
      <p className="ad-sub">{heads[1]}</p>
      <Chips items={[['rates', 'Rates & Limits'], ['odds', 'Game Odds'], ['nets', 'Networks & Links']]} value={tab} onChange={setTab} />

      {tab === 'rates' && (
        <>
          <Section title="📺 Main Watch Ads">
            <div className="ad-three">
              <Field label="Reward" type="number" value={f.mainAdReward} onChange={set('mainAdReward')} suffix="pts" />
              <Field label="Limit" type="number" value={f.mainAdDailyLimit} onChange={set('mainAdDailyLimit')} suffix="/ day" />
              <Field label="Cooldown" type="number" value={f.mainAdCooldownMinutes} onChange={set('mainAdCooldownMinutes')} suffix="mins" />
            </div>
          </Section>
          <Section title="📋 Daily Task · Watch Ads" badge="Unlock only at 5/5">
            <div className="ad-two">
              <Field label="Reward" type="number" value={f.adsTaskReward} onChange={set('adsTaskReward')} suffix="pts" />
              <Field label="Required ads" type="number" value={f.adsTaskTarget} onChange={set('adsTaskTarget')} suffix="ads" />
            </div>
          </Section>
          <Section title="🐷 Piggy Bank · Auto Mining" badge={`${f.piggyMinutes}-min cycle`}>
            <div className="ad-three">
              <Field label="Cycle" type="number" value={f.piggyMinutes} onChange={set('piggyMinutes')} suffix="mins" />
              <Field label="Free claim" type="number" value={f.piggyBase} onChange={set('piggyBase')} suffix="pts" />
              <Field label="2× ad claim" type="number" value={f.piggyBoosted} onChange={set('piggyBoosted')} suffix="pts" />
            </div>
          </Section>
          <Section title="📅 Daily Check-in · Day 1–7" badge="Points">
            <div className="ad-three">
              {f.streak.map((x, i) => <Field key={i} label={`Day ${i + 1}`} type="number" value={x} onChange={setArr('streak', i)} />)}
            </div>
          </Section>
          <Section title="👥 Referral Settings">
            <div className="ad-three">
              <Field label="Invite bonus" type="number" value={f.referralBonus} onChange={set('referralBonus')} suffix="pts" />
              <Field label="Friend watches" type="number" value={f.referralActivationAds} onChange={set('referralActivationAds')} suffix="ads" />
              <Field label="Commission" type="number" value={f.commissionPct} onChange={set('commissionPct')} suffix="%" />
            </div>
          </Section>
          <Section title="💸 Withdrawal & Revenue">
            <div className="ad-two">
              <Field label="Minimum withdrawal" type="number" value={f.minWithdraw} onChange={set('minWithdraw')} suffix="Ks" />
              <Field label="Ad revenue (for profit calc)" type="number" value={f.adRevenueKs} onChange={set('adRevenueKs')} suffix="Ks/ad" />
            </div>
          </Section>
          <Section title="🎮 Game Limits & Cooldowns">
            <div className="ad-two">
              <Field label="Spin per day" type="number" value={f.spinDailyLimit} onChange={set('spinDailyLimit')} />
              <Field label="Scratch per day" type="number" value={f.scratchDailyLimit} onChange={set('scratchDailyLimit')} />
              <Field label="Cooldown" type="number" value={f.gameCooldownMinutes} onChange={set('gameCooldownMinutes')} suffix="mins" />
              <Field label="Extra spin cost" type="number" value={f.spinPaidCost} onChange={set('spinPaidCost')} suffix="pts" />
              <Field label="Mystery Box cost" type="number" value={f.mysteryCost} onChange={set('mysteryCost')} suffix="pts" />
            </div>
          </Section>
        </>
      )}

      {tab === 'odds' && (
        <>
          <Odds game="spin" title="🎡 Lucky Spin" f={f} setOdd={setOdd} prizes={prizes} />
          <Odds game="scratch" title="🎫 Scratch Card" f={f} setOdd={setOdd} prizes={prizes} />
          <Odds game="mystery" title="🎁 Mystery Box" f={f} setOdd={setOdd} prizes={prizes} />
          <Note>Keep the average win below the cost for paid games (Mystery Box costs {f.mysteryCost} pts, Extra spin {f.spinPaidCost} pts).</Note>
        </>
      )}

      {tab === 'nets' && (
        <>
          <Section title="📺 Ad Network IDs" badge="No redeploy" tone="bad">
            <Field label="Primary · AdsGram Block ID" value={f.adsgramBlockId} onChange={set('adsgramBlockId')} placeholder="block-xxxx" />
            <Field label="Backup · OnClickA Spot ID (Telegram video)" value={f.onclickaSpotId} onChange={set('onclickaSpotId')} placeholder="spot id from OnClickA" />
            <Field label="Reserved · RichAds Zone ID" value={f.richadsZoneId} onChange={set('richadsZoneId')} placeholder="zone-xxxx" />
            <Field label="Reserved · Adsterra Direct Link" value={f.adsterraLink} onChange={set('adsterraLink')} placeholder="https://..." />
            <Note>AdsGram is tried first; if it has no ad (or the block is not active) OnClickA plays instead. RichAds and Adsterra are only stored for later.</Note>
          </Section>
          <Section title="🔁 Cross-Promo Redirects" badge="5 partner apps">
            <p className="ad-hint">Shown on the Watch Ads tab when a user reaches the daily ad limit.</p>
            {f.partners.map((p, i) => <Field key={i} label={`Partner App ${i + 1} · Bot / Website`} value={p} onChange={setArr('partners', i)} placeholder={`https://example.com/app${i + 1}`} />)}
            <Toggle label="Redirect when limit reached" hint="Enable partner recommendations" on={f.redirectOnLimit} onChange={set('redirectOnLimit')} />
          </Section>
        </>
      )}
      <Btn className="full big" onClick={save}>💾 Save All Settings</Btn>
    </>
  );
}
