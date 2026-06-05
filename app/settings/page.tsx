"use client";

import { useEffect, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Province {
  id: string;
  name: string;
  slug: string;
  url: string;
  weight: number;
  active: boolean;
  cachedScore: number | null;
  lastPushedAt: string | null;
  cachedAt: string | null;
}

interface NewKeys {
  apiKey: string;
  pullSecret: string;
  name: string;
}

export default function SettingsPage() {
  // ── Existing feed state (unchanged) ────────────────────────────────────────
  const [germanUrl, setGermanUrl] = useState("");
  const [healthUrl, setHealthUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // ── Province state ─────────────────────────────────────────────────────────
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [provLoading, setProvLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [regName, setRegName] = useState("");
  const [regSlug, setRegSlug] = useState("");
  const [regUrl, setRegUrl] = useState("");
  const [regWeight, setRegWeight] = useState("0.6");
  const [registering, setRegistering] = useState(false);
  const [newKeys, setNewKeys] = useState<NewKeys | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/feeds")
      .then((r) => r.json())
      .then((d) => {
        setGermanUrl(d.germanRoadmapUrl ?? "");
        setHealthUrl(d.personalAppUrl ?? "");
        setLoading(false);
      })
      .catch(() => setLoading(false));

    loadProvinces();
  }, []);

  function loadProvinces() {
    setProvLoading(true);
    fetch("/api/provinces")
      .then((r) => r.json())
      .then((d) => { setProvinces(d); setProvLoading(false); })
      .catch(() => setProvLoading(false));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/settings/feeds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ germanRoadmapUrl: germanUrl, personalAppUrl: healthUrl }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2400);
  }

  async function handleRegister() {
    if (!regName || !regSlug || !regUrl) return;
    setRegistering(true);
    const res = await fetch("/api/provinces/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: regName, slug: regSlug, url: regUrl, weight: Number(regWeight) }),
    });
    const data = await res.json();
    setRegistering(false);
    if (data.apiKey) {
      setNewKeys({ apiKey: data.apiKey, pullSecret: data.pullSecret, name: regName });
      setRegName(""); setRegSlug(""); setRegUrl(""); setRegWeight("0.6");
      setShowRegister(false);
      loadProvinces();
    }
  }

  async function toggleActive(slug: string, current: boolean) {
    await fetch(`/api/provinces/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !current }),
    });
    loadProvinces();
  }

  async function updateWeight(slug: string, weight: string) {
    await fetch(`/api/provinces/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weight: Number(weight) }),
    });
    loadProvinces();
  }

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1800);
  }

  function formatTime(ts: string | null) {
    if (!ts) return "never";
    const d = new Date(ts);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <>
      <style>{styles}</style>
      <div className="set-page">
        <div className="set-header">
          <h1 className="set-title">Settings</h1>
          <p className="set-subtitle">External feed connections</p>
        </div>

        {loading ? (
          <div className="set-loading">Loading…</div>
        ) : (
          <div className="set-body">
            {/* ── Existing feed sections (unchanged) ── */}
            <div className="set-section">
              <div className="set-section-head">
                <span className="set-icon">📖</span>
                <div>
                  <p className="set-label">German Roadmap App</p>
                  <p className="set-hint">Knowledge dimension — leave blank to use mock data</p>
                </div>
              </div>
              <input
                className="set-input" type="url"
                placeholder="https://your-german-roadmap.vercel.app"
                value={germanUrl} onChange={(e) => setGermanUrl(e.target.value)}
              />
              <p className="set-note">
                Expected response shape:{" "}
                <code>{"{ completion: 0–100, streak: number, todayCompleted: boolean }"}</code>
              </p>
            </div>

            <div className="set-section">
              <div className="set-section-head">
                <span className="set-icon">🏃</span>
                <div>
                  <p className="set-label">Personal App</p>
                  <p className="set-hint">Health dimension — leave blank to use mock data</p>
                </div>
              </div>
              <input
                className="set-input" type="url"
                placeholder="https://your-personal-app.vercel.app"
                value={healthUrl} onChange={(e) => setHealthUrl(e.target.value)}
              />
              <p className="set-note">
                Expected response shape:{" "}
                <code>{"{ exerciseCompleted: boolean, sleep: 0–10, youtubeTasksDone: 0–5 }"}</code>
              </p>
            </div>

            <button
              className={`set-btn ${saving ? "set-btn--saving" : ""} ${saved ? "set-btn--saved" : ""}`}
              onClick={handleSave} disabled={saving}
            >
              {saving ? "Saving…" : saved ? "✓ Saved" : "Save changes"}
            </button>

            {/* ── Province Registry (new) ── */}
            <div className="prov-header">
              <div>
                <p className="set-label" style={{ fontSize: 16 }}>Province Registry</p>
                <p className="set-hint">Apps connected to SK's life score</p>
              </div>
              <button className="prov-add-btn" onClick={() => setShowRegister(v => !v)}>
                {showRegister ? "Cancel" : "+ Register"}
              </button>
            </div>

            {showRegister && (
              <div className="set-section">
                <p className="set-label" style={{ marginBottom: 4 }}>New Province</p>
                <input className="set-input" placeholder="Name (e.g. Faith Tracker)"
                  value={regName} onChange={e => setRegName(e.target.value)} />
                <input className="set-input" placeholder="Slug (e.g. faith)"
                  value={regSlug} onChange={e => setRegSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))} />
                <input className="set-input" type="url" placeholder="App URL (https://...)"
                  value={regUrl} onChange={e => setRegUrl(e.target.value)} />
                <div className="prov-weight-row">
                  <label className="set-hint">Life score weight</label>
                  <input className="set-input prov-weight-input" type="number"
                    min="0" max="1" step="0.05" value={regWeight}
                    onChange={e => setRegWeight(e.target.value)} />
                </div>
                <button className="set-btn" onClick={handleRegister} disabled={registering}>
                  {registering ? "Registering…" : "Register Province"}
                </button>
              </div>
            )}

            {provLoading ? (
              <div className="set-loading">Loading provinces…</div>
            ) : provinces.length === 0 ? (
              <div className="prov-empty">No provinces registered yet.</div>
            ) : (
              <div className="prov-list">
                {provinces.map(p => (
                  <div key={p.id} className={`prov-card ${!p.active ? "prov-card--inactive" : ""}`}>
                    <div className="prov-card-top">
                      <div className="prov-card-info">
                        <span className="prov-name">{p.name}</span>
                        <span className="prov-slug">/{p.slug}</span>
                      </div>
                      <div className="prov-card-right">
                        <span className="prov-score">
                          {p.cachedScore != null ? Math.round(p.cachedScore) : "—"}
                        </span>
                        <button
                          className={`prov-toggle ${p.active ? "prov-toggle--on" : "prov-toggle--off"}`}
                          onClick={() => toggleActive(p.slug, p.active)}
                        >
                          {p.active ? "Active" : "Paused"}
                        </button>
                      </div>
                    </div>
                    <div className="prov-card-meta">
                      <span className="set-hint" style={{ fontSize: 11 }}>
                        Last push: {formatTime(p.lastPushedAt)}
                      </span>
                      <div className="prov-weight-row">
                        <span className="set-hint" style={{ fontSize: 11 }}>Weight:</span>
                        <input
                          className="set-input prov-weight-input"
                          type="number" min="0" max="1" step="0.05"
                          defaultValue={p.weight}
                          onBlur={e => updateWeight(p.slug, e.target.value)}
                        />
                      </div>
                    </div>
                    <p className="set-note" style={{ marginTop: 4 }}>{p.url}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── One-time keys modal ── */}
      {newKeys && (
        <div className="keys-overlay" onClick={() => setNewKeys(null)}>
          <div className="keys-modal" onClick={e => e.stopPropagation()}>
            <p className="keys-title">🔑 {newKeys.name} — Keys (shown once)</p>
            <p className="keys-warn">Copy these now. They will never be shown again.</p>

            <div className="keys-row">
              <span className="keys-label">API Key</span>
              <code className="keys-value">{newKeys.apiKey}</code>
              <button className="keys-copy" onClick={() => copyText(newKeys.apiKey, 'api')}>
                {copied === 'api' ? '✓' : 'Copy'}
              </button>
            </div>
            <div className="keys-row">
              <span className="keys-label">Pull Secret</span>
              <code className="keys-value">{newKeys.pullSecret}</code>
              <button className="keys-copy" onClick={() => copyText(newKeys.pullSecret, 'pull')}>
                {copied === 'pull' ? '✓' : 'Copy'}
              </button>
            </div>

            <button className="set-btn" style={{ marginTop: 16, width: '100%' }}
              onClick={() => setNewKeys(null)}>
              I've saved these — close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const styles = `
.set-page {
  max-width: 560px; margin: 0 auto;
  padding: 24px 16px 80px;
  font-family: var(--font-sans, sans-serif);
  color: #f4f4f5;
}
.set-header { margin-bottom: 24px; }
.set-title { font-size: 22px; font-weight: 700; margin: 0; }
.set-subtitle { font-size: 13px; color: #71717a; margin: 4px 0 0; }
.set-loading { color: #71717a; font-size: 14px; padding: 24px 0; }
.set-body { display: flex; flex-direction: column; gap: 20px; }
.set-section {
  background: #18181b; border: 1px solid #27272a;
  border-radius: 12px; padding: 16px;
  display: flex; flex-direction: column; gap: 10px;
}
.set-section-head { display: flex; align-items: flex-start; gap: 10px; }
.set-icon { font-size: 20px; margin-top: 1px; }
.set-label { font-size: 14px; font-weight: 600; margin: 0; }
.set-hint { font-size: 12px; color: #71717a; margin: 2px 0 0; }
.set-input {
  width: 100%; box-sizing: border-box;
  background: #09090b; border: 1px solid #3f3f46;
  border-radius: 8px; padding: 10px 12px;
  color: #f4f4f5; font-size: 13px;
  font-family: var(--font-mono, monospace);
  outline: none; transition: border-color 0.15s;
}
.set-input:focus { border-color: #22c55e; }
.set-input::placeholder { color: #52525b; }
.set-note {
  font-size: 11px; color: #52525b; margin: 0; line-height: 1.5;
}
.set-note code {
  font-family: var(--font-mono, monospace);
  background: #27272a; padding: 1px 5px; border-radius: 4px; font-size: 10px;
}
.set-btn {
  align-self: flex-start;
  background: #22c55e; color: #052e16;
  border: none; border-radius: 8px;
  padding: 10px 22px; font-size: 14px; font-weight: 600;
  cursor: pointer; transition: background 0.15s, opacity 0.15s;
}
.set-btn:hover { background: #16a34a; }
.set-btn--saving { opacity: 0.6; cursor: default; }
.set-btn--saved { background: #166534; color: #86efac; }

/* Province section */
.prov-header {
  display: flex; align-items: center;
  justify-content: space-between;
  padding: 4px 0;
}
.prov-add-btn {
  background: #27272a; color: #22c55e;
  border: 1px solid #3f3f46; border-radius: 8px;
  padding: 6px 14px; font-size: 13px; font-weight: 600;
  cursor: pointer; transition: background 0.15s;
}
.prov-add-btn:hover { background: #3f3f46; }
.prov-weight-row {
  display: flex; align-items: center; gap: 8px;
}
.prov-weight-input {
  width: 72px !important; padding: 6px 8px !important;
  font-size: 12px !important;
}
.prov-empty { color: #52525b; font-size: 13px; padding: 8px 0; }
.prov-list { display: flex; flex-direction: column; gap: 10px; }
.prov-card {
  background: #18181b; border: 1px solid #27272a;
  border-radius: 12px; padding: 14px;
  display: flex; flex-direction: column; gap: 8px;
  transition: opacity 0.2s;
}
.prov-card--inactive { opacity: 0.5; }
.prov-card-top {
  display: flex; align-items: center;
  justify-content: space-between;
}
.prov-card-info { display: flex; flex-direction: column; gap: 2px; }
.prov-name { font-size: 14px; font-weight: 600; color: #f4f4f5; }
.prov-slug { font-size: 11px; color: #52525b; font-family: var(--font-mono, monospace); }
.prov-card-right { display: flex; align-items: center; gap: 10px; }
.prov-score {
  font-size: 22px; font-weight: 700; color: #22c55e;
  min-width: 36px; text-align: right;
}
.prov-toggle {
  border: none; border-radius: 6px;
  padding: 4px 10px; font-size: 11px; font-weight: 600;
  cursor: pointer; transition: background 0.15s;
}
.prov-toggle--on  { background: #14532d; color: #86efac; }
.prov-toggle--off { background: #27272a; color: #71717a; }
.prov-card-meta {
  display: flex; align-items: center;
  justify-content: space-between; flex-wrap: wrap; gap: 6px;
}

/* One-time keys modal */
.keys-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.75);
  display: flex; align-items: center; justify-content: center;
  z-index: 999; padding: 16px;
}
.keys-modal {
  background: #18181b; border: 1px solid #3f3f46;
  border-radius: 16px; padding: 24px;
  width: 100%; max-width: 480px;
  display: flex; flex-direction: column; gap: 12px;
}
.keys-title { font-size: 15px; font-weight: 700; margin: 0; }
.keys-warn {
  font-size: 12px; color: #fbbf24;
  background: #451a03; border: 1px solid #92400e;
  border-radius: 6px; padding: 8px 10px; margin: 0;
}
.keys-row {
  display: flex; align-items: center; gap: 8px;
  background: #09090b; border: 1px solid #27272a;
  border-radius: 8px; padding: 10px 12px;
}
.keys-label {
  font-size: 11px; color: #71717a; white-space: nowrap;
  min-width: 72px;
}
.keys-value {
  font-family: var(--font-mono, monospace);
  font-size: 10px; color: #a1a1aa;
  flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.keys-copy {
  background: #27272a; color: #22c55e;
  border: none; border-radius: 5px;
  padding: 4px 10px; font-size: 11px; font-weight: 600;
  cursor: pointer; white-space: nowrap;
}
.keys-copy:hover { background: #3f3f46; }
`;