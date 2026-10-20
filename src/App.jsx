import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api, hasTelegram, canUseDevUser } from './api.js';
import { WebApp, haptic, beep, openLink } from './tg.js';
import { Icon, Toast, Button } from './components/ui.jsx';
import AdOverlay from './components/AdOverlay.jsx';
import { WithdrawSheet, SettingsSheet } from './components/Sheets.jsx';
import Home from './pages/Home.jsx';
import Tasks from './pages/Tasks.jsx';
import Invites from './pages/Invites.jsx';
import Profile from './pages/Profile.jsx';
import History from './pages/History.jsx';

const TABS = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'tasks', label: 'Tasks', icon: 'tasks-checklist' },
  { id: 'invites', label: 'Invites', icon: 'users' },
  { id: 'profile', label: 'Profile', icon: 'user' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function App() {
  const [me, setMe] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('home');
  const [view, setView] = useState(null); // 'history'
  const [sheet, setSheet] = useState(null); // 'withdraw' | 'settings'
  const [ad, setAd] = useState(null); // countdown overlay
  const [busy, setBusy] = useState('');
  const [toast, setToast] = useState(null);
  const busyRef = useRef('');
  const toastTimer = useRef();

  const notify = useCallback((text, type = 'info') => {
    clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), text, type });
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }, []);

  const refresh = useCallback(async () => {
    try {
      setMe(await api('/api/me'));
      setError(null);
    } catch (e) {
      setError(e);
    }
  }, []);

  useEffect(() => {
    if (hasTelegram() || canUseDevUser()) refresh();
    else setError({ code: 'not_telegram', message: 'Please open PinkEarn from Telegram.' });
  }, [refresh]);

  // reload when the user comes back to the app
  useEffect(() => {
    const onVis = () => document.visibilityState === 'visible' && me && refresh();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [me, refresh]);

  // Telegram native back button for sub views
  useEffect(() => {
    const bb = WebApp()?.BackButton;
    if (!bb) return undefined;
    const back = () => setView(null);
    if (view) {
      bb.show();
      bb.onClick(back);
    } else bb.hide();
    return () => bb.offClick?.(back);
  }, [view]);

  const go = (t) => {
    setView(null);
    setTab(t);
    window.scrollTo({ top: 0 });
  };

  /* ------------------------------- actions ------------------------------- */
  const celebrate = (reward) => {
    haptic('success');
    beep('success');
    notify(`+${reward} pts earned!`, 'success');
  };

  async function run(key, path, okText) {
    if (busyRef.current) return;
    busyRef.current = key;
    setBusy(key);
    try {
      const r = await api(path, { method: 'POST' });
      okText ? (haptic('success'), beep('success'), notify(okText(r), 'success')) : null;
      await refresh();
    } catch (e) {
      haptic('error');
      notify(e.message, 'error');
      refresh();
    } finally {
      busyRef.current = '';
      setBusy('');
    }
  }

  const checkin = () => run('checkin', '/api/checkin', (r) => `Checked in! +${r.reward} pts (Day ${r.day})`);
  const claimAdsTask = () => run('tasks-ads', '/api/tasks/ads/claim', (r) => `Task done! +${r.reward} pts`);
  const claimInviteTask = () => run('tasks-invite', '/api/tasks/invite/claim', (r) => `Task done! +${r.reward} pts`);
  const claimBonus = () => run('claim-bonus', '/api/referrals/claim', (r) => `Bonus claimed! +${r.claimed} pts`);

  const showOverlay = (opts) =>
    new Promise((resolve) => setAd({ ...opts, resolve }));

  async function showAdsgram(blockId) {
    try {
      const ctrl = window.Adsgram.init({ blockId });
      const r = await ctrl.show();
      if (!r?.done) notify('Watch the whole ad to earn points', 'error');
      return !!r?.done;
    } catch (r) {
      notify(r?.description === 'user_skipped' || r?.done === false ? 'Watch the whole ad to earn points' : 'No ads available right now. Try again soon.', 'error');
      return false;
    }
  }

  async function completeAd(sessionId) {
    for (let i = 0; i < 5; i += 1) {
      try {
        return await api('/api/ads/complete', { method: 'POST', body: { sessionId } });
      } catch (e) {
        // the provider's server callback can arrive a moment after the ad closes
        if ((e.code === 'awaiting_provider' || e.code === 'too_early') && i < 4) await sleep(1500);
        else throw e;
      }
    }
    return null;
  }

  async function watchAd({ offerId, title }) {
    if (busyRef.current || !me) return;
    const key = `ad:${offerId || 'main'}`;
    busyRef.current = key;
    setBusy(key);
    try {
      const s = await api('/api/ads/start', { method: 'POST', body: offerId ? { offerId } : {} });
      let watched = false;

      if (s.url) {
        openLink(s.url);
        watched = await showOverlay({ title, seconds: s.seconds, reward: s.reward, isLink: true });
      } else if (me.config.adsgramBlockId && window.Adsgram) {
        watched = await showAdsgram(me.config.adsgramBlockId);
      } else if (me.config.demoAds) {
        watched = await showOverlay({ title, seconds: s.seconds, reward: s.reward, isLink: false });
      } else {
        throw new Error('No ads available right now. Try again soon.');
      }

      if (watched) {
        const r = await completeAd(s.sessionId);
        if (r) celebrate(r.reward);
      }
      await refresh();
    } catch (e) {
      haptic('error');
      notify(e.message, 'error');
      refresh();
    } finally {
      busyRef.current = '';
      setBusy('');
    }
  }

  function openWithdraw() {
    if (!me) return;
    const need = me.withdraw.min * me.withdraw.ptsPerKs;
    if (me.withdraw.hasPending) {
      haptic('warning');
      return notify('You already have a pending withdrawal', 'error');
    }
    if (me.balance < need) {
      haptic('error');
      const more = Math.ceil((need - me.balance) / me.withdraw.ptsPerKs);
      return notify(`Minimum payout is ${me.withdraw.min} Ks. You need ${more} Ks more.`, 'error');
    }
    setSheet('withdraw');
  }

  const ctx = {
    go,
    openWithdraw,
    notify,
    busy,
    checkin,
    claimAdsTask,
    claimInviteTask,
    claimBonus,
    watchAd,
    openSheet: setSheet,
    openHistory: () => {
      setView('history');
      window.scrollTo({ top: 0 });
    },
  };

  /* -------------------------------- render -------------------------------- */
  if (error && !me) {
    const offline = error.code !== 'not_telegram' && error.status !== 403;
    return (
      <div className="app center-screen">
        <div className="logo-badge"><Icon name="telegram-plane" size={34} /></div>
        <h1 className="page-title">PinkEarn</h1>
        <p className="muted">{error.message}</p>
        {offline && <Button onClick={refresh}>Try again</Button>}
      </div>
    );
  }

  if (!me) {
    return (
      <div className="app center-screen">
        <div className="loader" />
      </div>
    );
  }

  return (
    <div className="app">
      {view === 'history' ? (
        <History onBack={() => setView(null)} />
      ) : (
        <>
          {tab === 'home' && <Home me={me} ctx={ctx} />}
          {tab === 'tasks' && <Tasks me={me} ctx={ctx} />}
          {tab === 'invites' && <Invites me={me} ctx={ctx} />}
          {tab === 'profile' && <Profile me={me} ctx={ctx} />}
        </>
      )}

      <nav className="nav" aria-label="Main">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={`nav-item ${tab === t.id && !view ? 'on' : ''}`} onClick={() => go(t.id)}>
            <span className="nav-ic"><Icon name={t.icon} size={24} /></span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {sheet === 'withdraw' && (
        <WithdrawSheet
          me={me}
          notify={notify}
          onClose={() => setSheet(null)}
          onDone={() => {
            setSheet(null);
            refresh();
          }}
        />
      )}
      {sheet === 'settings' && <SettingsSheet onClose={() => setSheet(null)} />}

      {ad && (
        <AdOverlay
          title={ad.title}
          seconds={ad.seconds}
          reward={ad.reward}
          isLink={ad.isLink}
          onDone={(ok) => {
            ad.resolve(ok);
            setAd(null);
          }}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}
