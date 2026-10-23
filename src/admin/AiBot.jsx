import React, { useEffect, useState } from 'react';
import { Sheet } from '../components/ui.jsx';
import { adminApi } from './adminApi.js';
import { useLoad } from './useLoad.js';
import { Section, Row, Note, Empty, Btn, Field, Toggle, num } from './ui.jsx';

const TONE = { active: 'good', exhausted: 'warn', off: '' };
const LABEL = { active: 'Active', exhausted: 'Limit reached', off: 'Off' };
const left = (d) => {
  const m = Math.max(1, Math.round((new Date(d) - Date.now()) / 60000));
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
};

export default function AiBot({ notify }) {
  const { data, error, load } = useLoad(() => adminApi('/ai'), []);
  const [f, setF] = useState(null);
  const [modal, setModal] = useState(null); // {id?, provider, key}

  useEffect(() => {
    if (data && !f) {
      const s = data.settings;
      setF({ ...s, aiDailyLimit: String(s.aiDailyLimit), aiMaxInput: String(s.aiMaxInput) });
    }
  }, [data, f]);

  const run = async (fn, ok) => {
    try {
      await fn();
      if (ok) notify(ok, 'success');
      await load();
    } catch (e) {
      notify(e.message, 'error');
    }
  };
  if (error) return <Note tone="bad">{error}</Note>;
  if (!data || !f) return <Empty>Loading…</Empty>;
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const saveSettings = () => run(() => adminApi('/ai/settings', { method: 'PUT', body: { ...f, aiDailyLimit: Number(f.aiDailyLimit), aiMaxInput: Number(f.aiMaxInput) } }), 'AI settings saved');
  const saveKey = () =>
    run(async () => {
      if (modal.id) await adminApi(`/ai/keys/${modal.id}`, { method: 'PATCH', body: { provider: modal.provider, ...(modal.key ? { key: modal.key } : {}) } });
      else await adminApi('/ai/keys', { method: 'POST', body: { provider: modal.provider, key: modal.key } });
      setModal(null);
    }, 'API key saved');
  const test = async (k) => {
    try {
      const r = await adminApi(`/ai/keys/${k.id}/test`, { method: 'POST' });
      notify(r.ok ? `Key works · reply: ${r.reply}` : r.error, r.ok ? 'success' : 'error');
      load();
    } catch (e) {
      notify(e.message, 'error');
    }
  };

  return (
    <>
      <p className="ad-eyebrow">ShadowEarn Admin</p>
      <h1 className="ad-title">AI Bot Manager</h1>
      <p className="ad-sub">API keys, daily limits and failover for the support assistant.</p>

      <div className="ad-grid">
        <div className="ad-stat"><p>💬 Questions today</p><b>{num(data.stats.questions)}</b><small>{num(data.stats.users)} users</small></div>
        <div className="ad-stat"><p>🚫 Blocked the bot</p><b>{num(data.stats.blocked)}</b><small>skipped in broadcasts</small></div>
      </div>

      <Section title="Global User Limit" badge={f.aiEnabled ? 'Bot ON' : 'Bot OFF'} tone={f.aiEnabled ? 'good' : 'bad'}>
        <Toggle label="AI assistant enabled" hint="Off = the bot stays silent for normal messages" on={f.aiEnabled} onChange={set('aiEnabled')} />
        <Toggle label="Enable daily user limit" hint="Counted per user per day (Myanmar time)" on={f.aiLimitEnabled} onChange={set('aiLimitEnabled')} />
        <div className="ad-two">
          <Field label="Max questions / user / day" type="number" value={f.aiDailyLimit} onChange={set('aiDailyLimit')} />
          <Field label="Max message length" type="number" value={f.aiMaxInput} onChange={set('aiMaxInput')} suffix="chars" />
          <Field label="Gemini model" value={f.aiGeminiModel} onChange={set('aiGeminiModel')} />
          <Field label="Groq model" value={f.aiGroqModel} onChange={set('aiGroqModel')} />
        </div>
        <Field area rows={4} label="Extra facts for the AI (optional)" value={f.aiExtra} onChange={set('aiExtra')} placeholder="e.g. Withdrawals are paid between 9 AM and 9 PM." />
        <Btn className="full" onClick={saveSettings}>💾 Save AI Settings</Btn>
      </Section>

      <Section title="API Keys" badge={`${data.keys.filter((k) => k.status === 'active').length} active`} tone="good">
        {data.keys.length === 0 && <Empty>No keys yet. Add a Gemini or Groq key.</Empty>}
        {data.keys.map((k) => (
          <div className="ad-item ai-key" key={k.id}>
            <span>
              <b>{k.provider === 'gemini' ? 'Gemini' : 'Groq'}</b> <code className="ad-code">{k.masked}</code><br />
              <span className={`ad-badge ${TONE[k.status]}`}>{LABEL[k.status]}{k.exhaustedUntil ? ` · back in ${left(k.exhaustedUntil)}` : ''}</span>{' '}
              <small>{num(k.usedToday)} used today</small>
              {k.lastError && <><br /><small className="bad">{k.lastError.slice(0, 90)}</small></>}
            </span>
            <span className="ad-stack">
              <Btn tone="line" onClick={() => test(k)}>🧪 Test</Btn>
              <Btn tone="line" onClick={() => setModal({ id: k.id, provider: k.provider, key: '' })}>✏️ Edit</Btn>
              {k.status === 'exhausted' && <Btn tone="line" onClick={() => run(() => adminApi(`/ai/keys/${k.id}`, { method: 'PATCH', body: { resetExhausted: true } }), 'Key re-enabled')}>↺ Reset</Btn>}
              <Btn tone="line" onClick={() => run(() => adminApi(`/ai/keys/${k.id}`, { method: 'PATCH', body: { isActive: !k.isActive } }), k.isActive ? 'Key turned off' : 'Key turned on')}>{k.isActive ? '⏸ Off' : '▶ On'}</Btn>
              <Btn tone="redline" onClick={() => window.confirm('Remove this key?') && run(() => adminApi(`/ai/keys/${k.id}`, { method: 'DELETE' }), 'Key removed')}>🗑️ Remove</Btn>
            </span>
          </div>
        ))}
        <Btn className="full" onClick={() => setModal({ provider: 'gemini', key: '' })}>➕ Add API Key</Btn>
        <Note tone="good">Keys are encrypted (AES-256) in the database and never sent back to this screen. When a key hits its limit it is parked automatically and the next key answers the same question at once.</Note>
        {!data.secretSet && <Note>Tip: set AI_KEY_SECRET in Render so the encryption key does not depend on the bot token.</Note>}
      </Section>

      {modal && (
        <Sheet title={modal.id ? 'Edit API Key' : 'Add API Key'} onClose={() => setModal(null)}>
          <label className="ad-field"><span>Select provider</span>
            <select className="ad-select" value={modal.provider} onChange={(e) => setModal({ ...modal, provider: e.target.value })}>
              <option value="gemini">Gemini</option>
              <option value="groq">Groq</option>
            </select>
          </label>
          <Field label={modal.id ? 'New API key (leave empty to keep the current one)' : 'API key'} value={modal.key} onChange={(v) => setModal({ ...modal, key: v })} placeholder="paste the key here" />
          <Btn className="full" disabled={!modal.id && modal.key.length < 20} onClick={saveKey}>Save</Btn>
          <Btn tone="line" className="full" onClick={() => setModal(null)}>Cancel</Btn>
        </Sheet>
      )}
    </>
  );
}
