// pages/SettingsPage.jsx
import { useState, useEffect } from "react";
import { preferences, auth } from "../services/api";
import { useAuth } from "../context/AuthContext";

const s = {
  page: { flex: 1, overflowY: "auto", padding: "32px", background: "var(--bg)" },
  title: { fontSize: "22px", fontWeight: 800, color: "var(--text)", marginBottom: "4px" },
  subtitle: { fontSize: "13px", color: "var(--text-muted)", marginBottom: "32px" },
  section: {
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: "14px", overflow: "hidden", marginBottom: "20px",
  },
  sectionHead: {
    padding: "16px 20px", borderBottom: "1px solid var(--border)",
    display: "flex", alignItems: "center", gap: "10px",
    background: "var(--surface2)",
  },
  sectionTitle: { fontSize: "14px", fontWeight: 700, color: "var(--text)" },
  row: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "14px 20px", borderBottom: "1px solid var(--border)",
  },
  rowLast: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "14px 20px",
  },
  rowLabel: { fontSize: "13px", color: "var(--text)", fontWeight: 600 },
  rowSub:   { fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" },
  toggle: (on) => ({
    width: "40px", height: "22px", borderRadius: "11px",
    background: on ? "var(--accent)" : "var(--surface2)",
    border: "1px solid var(--border)",
    position: "relative", cursor: "pointer", transition: "background .2s",
    flexShrink: 0,
  }),
  thumb: (on) => ({
    width: "16px", height: "16px", borderRadius: "50%", background: "#fff",
    position: "absolute", top: "2px",
    left: on ? "20px" : "2px", transition: "left .2s",
  }),
  select: {
    background: "var(--surface2)", border: "1px solid var(--border)",
    borderRadius: "8px", padding: "6px 10px", color: "var(--text)", fontSize: "13px",
    outline: "none", cursor: "pointer",
  },
  input: {
    background: "var(--surface2)", border: "1px solid var(--border)",
    borderRadius: "8px", padding: "6px 10px", color: "var(--text)", fontSize: "13px",
    outline: "none", fontFamily: "'Syne', sans-serif", width: "220px",
  },
  saveBtn: {
    background: "var(--accent)", border: "none", borderRadius: "8px",
    padding: "9px 20px", color: "#fff", fontSize: "13px", fontWeight: 700,
    cursor: "pointer", marginTop: "8px",
  },
  dangerBtn: {
    background: "#f8717122", border: "1px solid #f87171",
    borderRadius: "8px", padding: "8px 16px",
    color: "#f87171", fontSize: "13px", cursor: "pointer",
  },
  toast: {
    position: "fixed", bottom: "24px", right: "24px",
    background: "#4ade8022", border: "1px solid #4ade80",
    borderRadius: "10px", padding: "10px 18px",
    color: "#4ade80", fontSize: "13px", fontWeight: 600,
    animation: "fadeSlide .25s ease", zIndex: 200,
  },
};

function Toggle({ value, onChange }) {
  return (
    <div style={s.toggle(value)} onClick={() => onChange(!value)}>
      <div style={s.thumb(value)} />
    </div>
  );
}

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const [prefs, setPrefs] = useState(null);
  const [profile, setProfile] = useState({ first_name: "", last_name: "", username: "" });
  const [toast, setToast] = useState("");

  useEffect(() => {
    preferences.get().then(setPrefs).catch(() => {});
    if (user) setProfile({ first_name: user.first_name || "", last_name: user.last_name || "", username: user.username || "" });
  }, [user]);

  const setPref = k => v => setPrefs(p => ({ ...p, [k]: v }));

  const savePrefs = async () => {
    await preferences.update(prefs).catch(() => {});
    showToast("Preferences saved!");
  };

  const saveProfile = async () => {
    const updated = await auth.updateMe(profile).catch(() => null);
    if (updated) { setUser(updated); showToast("Profile updated!"); }
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  if (!prefs) return <div style={{ ...s.page, color: "var(--text-muted)" }}>Loading…</div>;

  return (
    <div style={s.page}>
      <div style={s.title}>Settings</div>
      <div style={s.subtitle}>Manage your account and application preferences</div>

      {/* Profile */}
      <div style={s.section}>
        <div style={s.sectionHead}>
          <i className="bi bi-person-circle" style={{ color: "var(--accent)" }} />
          <div style={s.sectionTitle}>Profile</div>
        </div>
        {[
          { label: "Username",   key: "username",   placeholder: "your_handle" },
          { label: "First Name", key: "first_name", placeholder: "Ada" },
          { label: "Last Name",  key: "last_name",  placeholder: "Lovelace" },
        ].map(({ label, key, placeholder }, i, arr) => (
          <div key={key} style={i === arr.length - 1 ? s.rowLast : s.row}>
            <div><div style={s.rowLabel}>{label}</div></div>
            <input
              style={s.input}
              value={profile[key]}
              onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))}
              placeholder={placeholder}
            />
          </div>
        ))}
        <div style={{ padding: "12px 20px 16px" }}>
          <button style={s.saveBtn} onClick={saveProfile}>Save Profile</button>
        </div>
      </div>

      {/* Appearance */}
      <div style={s.section}>
        <div style={s.sectionHead}>
          <i className="bi bi-palette" style={{ color: "var(--accent)" }} />
          <div style={s.sectionTitle}>Appearance</div>
        </div>
        <div style={s.row}>
          <div>
            <div style={s.rowLabel}>Theme</div>
            <div style={s.rowSub}>Interface color scheme</div>
          </div>
          <select style={s.select} value={prefs.theme} onChange={e => setPref("theme")(e.target.value)}>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">System</option>
          </select>
        </div>
        <div style={s.rowLast}>
          <div>
            <div style={s.rowLabel}>Font Size</div>
            <div style={s.rowSub}>Text size in chat</div>
          </div>
          <select style={s.select} value={prefs.font_size} onChange={e => setPref("font_size")(e.target.value)}>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>
      </div>

      {/* Behaviour */}
      <div style={s.section}>
        <div style={s.sectionHead}>
          <i className="bi bi-sliders" style={{ color: "var(--accent)" }} />
          <div style={s.sectionTitle}>Behaviour</div>
        </div>
        {[
          { label: "Send on Enter",         sub: "Press Enter to send messages",       key: "send_on_enter" },
          { label: "Show Code Line Numbers",sub: "Display line numbers in code blocks",key: "show_code_line_nums" },
          { label: "Memory Enabled",        sub: "Allow AI to remember context",       key: "memory_enabled" },
          { label: "Analytics",             sub: "Help improve with usage data",       key: "analytics_opt_in" },
        ].map(({ label, sub, key }, i, arr) => (
          <div key={key} style={i === arr.length - 1 ? s.rowLast : s.row}>
            <div>
              <div style={s.rowLabel}>{label}</div>
              <div style={s.rowSub}>{sub}</div>
            </div>
            <Toggle value={prefs[key]} onChange={setPref(key)} />
          </div>
        ))}
      </div>

      <button style={s.saveBtn} onClick={savePrefs}>Save All Preferences</button>

      {toast && <div style={s.toast}><i className="bi bi-check2-circle" /> {toast}</div>}

      <style>{`@keyframes fadeSlide { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}