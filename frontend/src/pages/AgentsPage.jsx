// pages/AgentsPage.jsx
import { useState, useEffect } from "react";
import { agents } from "../services/api";

const s = {
  page: { flex: 1, overflowY: "auto", padding: "32px", background: "var(--bg)" },
  header: { marginBottom: "28px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  title: { fontSize: "22px", fontWeight: 800, color: "var(--text)", fontFamily: "'Syne', sans-serif" },
  subtitle: { fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" },
  addBtn: {
    background: "var(--accent)", border: "none", borderRadius: "10px",
    padding: "9px 18px", color: "#fff", fontSize: "13px", fontWeight: 700,
    cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
    fontFamily: "'Syne', sans-serif",
  },
  grid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: "16px",
  },
  card: {
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: "14px", padding: "20px", cursor: "pointer",
    transition: "all .2s", position: "relative",
  },
  avatar: {
    width: "44px", height: "44px", borderRadius: "12px",
    background: "linear-gradient(135deg, var(--accent), #a78bfa)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "20px", marginBottom: "12px",
  },
  name: { fontSize: "15px", fontWeight: 700, color: "var(--text)", marginBottom: "4px" },
  desc: { fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.5" },
  badge: {
    position: "absolute", top: "14px", right: "14px",
    fontSize: "10px", fontWeight: 700, padding: "2px 8px",
    borderRadius: "20px", letterSpacing: ".5px",
  },
  modal: {
    position: "fixed", inset: 0, background: "#000a",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 100,
  },
  modalBox: {
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: "16px", padding: "28px", width: "440px",
    boxShadow: "0 24px 64px #0008",
  },
  modalTitle: { fontSize: "17px", fontWeight: 800, marginBottom: "20px", color: "var(--text)" },
  field: { marginBottom: "14px" },
  label: { fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "5px", letterSpacing: ".5px" },
  input: {
    width: "100%", background: "var(--surface2)", border: "1px solid var(--border)",
    borderRadius: "8px", padding: "9px 12px", color: "var(--text)", fontSize: "13px",
    fontFamily: "'Syne', sans-serif", outline: "none",
  },
  textarea: {
    width: "100%", background: "var(--surface2)", border: "1px solid var(--border)",
    borderRadius: "8px", padding: "9px 12px", color: "var(--text)", fontSize: "13px",
    fontFamily: "'Syne', sans-serif", outline: "none", resize: "vertical", minHeight: "80px",
  },
  modalBtns: { display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "20px" },
  cancelBtn: {
    background: "var(--surface2)", border: "1px solid var(--border)",
    borderRadius: "8px", padding: "8px 16px", color: "var(--text-muted)",
    cursor: "pointer", fontSize: "13px",
  },
  saveBtn: {
    background: "var(--accent)", border: "none", borderRadius: "8px",
    padding: "8px 18px", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer",
  },
};

const ICONS = ["🤖", "🧠", "⚡", "🔬", "📚", "💡", "🎯", "🛠️"];

export default function AgentsPage() {
  const [list, setList]   = useState([]);
  const [open, setOpen]   = useState(false);
  const [form, setForm]   = useState({ name: "", description: "", system_prompt: "", icon: "🤖" });
  const [saving, setSave] = useState(false);

  useEffect(() => {
    agents.list().then(r => setList(Array.isArray(r) ? r : r.results || [])).catch(() => {});
  }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSave(true);
    try {
      const a = await agents.create(form);
      setList(prev => [a, ...prev]);
      setOpen(false);
      setForm({ name: "", description: "", system_prompt: "", icon: "🤖" });
    } catch {}
    setSave(false);
  };

  const remove = async (id) => {
    await agents.delete(id).catch(() => {});
    setList(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <div style={s.title}>Agents</div>
          <div style={s.subtitle}>Custom AI personas with specialized instructions</div>
        </div>
        <button style={s.addBtn} onClick={() => setOpen(true)}>
          <i className="bi bi-plus-lg" /> New Agent
        </button>
      </div>

      <div style={s.grid}>
        {list.map(agent => (
          <div key={agent.id} style={s.card}>
            <div style={s.badge()} className={agent.is_public ? "" : ""} style={{
              ...s.badge,
              background: agent.is_public ? "#4ade8022" : "var(--surface2)",
              color: agent.is_public ? "#4ade80" : "var(--text-muted)",
            }}>
              {agent.is_public ? "PUBLIC" : "PRIVATE"}
            </div>
            <div style={s.avatar}>{agent.avatar_url || "🤖"}</div>
            <div style={s.name}>{agent.name}</div>
            <div style={s.desc}>{agent.description || "No description"}</div>
            <button
              onClick={() => remove(agent.id)}
              style={{ ...s.cancelBtn, marginTop: "14px", fontSize: "12px" }}
            >
              <i className="bi bi-trash" /> Delete
            </button>
          </div>
        ))}

        {list.length === 0 && (
          <div style={{ color: "var(--text-muted)", fontSize: "14px", padding: "20px 0" }}>
            No agents yet. Create one to get started.
          </div>
        )}
      </div>

      {/* Create modal */}
      {open && (
        <div style={s.modal} onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div style={s.modalBox}>
            <div style={s.modalTitle}>New Agent</div>

            <div style={{ display: "flex", gap: "8px", marginBottom: "14px", flexWrap: "wrap" }}>
              {ICONS.map(icon => (
                <button key={icon} onClick={() => setForm(f => ({ ...f, icon }))}
                  style={{
                    fontSize: "20px", padding: "6px", borderRadius: "8px", border: "2px solid",
                    borderColor: form.icon === icon ? "var(--accent)" : "transparent",
                    background: "var(--surface2)", cursor: "pointer",
                  }}>
                  {icon}
                </button>
              ))}
            </div>

            <div style={s.field}>
              <label style={s.label}>NAME</label>
              <input style={s.input} value={form.name} onChange={set("name")} placeholder="My Agent" />
            </div>
            <div style={s.field}>
              <label style={s.label}>DESCRIPTION</label>
              <input style={s.input} value={form.description} onChange={set("description")} placeholder="What does this agent do?" />
            </div>
            <div style={s.field}>
              <label style={s.label}>SYSTEM PROMPT</label>
              <textarea style={s.textarea} value={form.system_prompt} onChange={set("system_prompt")}
                placeholder="You are a helpful assistant that specializes in…" />
            </div>

            <div style={s.modalBtns}>
              <button style={s.cancelBtn} onClick={() => setOpen(false)}>Cancel</button>
              <button style={s.saveBtn} onClick={save} disabled={saving}>
                {saving ? "Creating…" : "Create Agent"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}