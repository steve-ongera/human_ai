// pages/KnowledgePage.jsx
import { useState, useEffect } from "react";
import { knowledgeBases } from "../services/api";

const s = {
  page: { flex: 1, overflowY: "auto", padding: "32px", background: "var(--bg)" },
  header: { marginBottom: "28px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  title: { fontSize: "22px", fontWeight: 800, color: "var(--text)" },
  subtitle: { fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" },
  addBtn: {
    background: "var(--accent)", border: "none", borderRadius: "10px",
    padding: "9px 18px", color: "#fff", fontSize: "13px", fontWeight: 700,
    cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
  },
  grid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "16px",
  },
  card: {
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: "14px", padding: "20px",
    transition: "border-color .15s, box-shadow .15s",
    cursor: "pointer",
  },
  iconWrap: {
    width: "42px", height: "42px", borderRadius: "10px",
    background: "linear-gradient(135deg, #06b6d422, #3b82f622)",
    border: "1px solid #06b6d433",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "18px", marginBottom: "12px",
  },
  name: { fontSize: "15px", fontWeight: 700, color: "var(--text)", marginBottom: "4px" },
  desc: { fontSize: "12px", color: "var(--text-muted)", marginBottom: "12px", lineHeight: "1.5" },
  meta: { display: "flex", gap: "12px", alignItems: "center" },
  metaItem: { fontSize: "11px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" },
  modal: {
    position: "fixed", inset: 0, background: "#000a",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
  },
  modalBox: {
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: "16px", padding: "28px", width: "420px",
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
    fontFamily: "'Syne', sans-serif", outline: "none", resize: "vertical", minHeight: "70px",
  },
  modalBtns: { display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "20px" },
  cancelBtn: {
    background: "var(--surface2)", border: "1px solid var(--border)",
    borderRadius: "8px", padding: "8px 16px", color: "var(--text-muted)", cursor: "pointer", fontSize: "13px",
  },
  saveBtn: {
    background: "var(--accent)", border: "none", borderRadius: "8px",
    padding: "8px 18px", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer",
  },
};

export default function KnowledgePage() {
  const [list, setList]   = useState([]);
  const [open, setOpen]   = useState(false);
  const [form, setForm]   = useState({ name: "", description: "", is_public: false });
  const [saving, setSave] = useState(false);

  useEffect(() => {
    knowledgeBases.list().then(r => setList(Array.isArray(r) ? r : r.results || [])).catch(() => {});
  }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSave(true);
    try {
      const kb = await knowledgeBases.create(form);
      setList(prev => [kb, ...prev]);
      setOpen(false);
      setForm({ name: "", description: "", is_public: false });
    } catch {}
    setSave(false);
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <div style={s.title}>Knowledge Bases</div>
          <div style={s.subtitle}>Document stores for retrieval-augmented generation</div>
        </div>
        <button style={s.addBtn} onClick={() => setOpen(true)}>
          <i className="bi bi-plus-lg" /> New Knowledge Base
        </button>
      </div>

      <div style={s.grid}>
        {list.map(kb => (
          <div key={kb.id} style={s.card}>
            <div style={s.iconWrap}><i className="bi bi-journal-bookmark" style={{ color: "#06b6d4" }} /></div>
            <div style={s.name}>{kb.name}</div>
            <div style={s.desc}>{kb.description || "No description"}</div>
            <div style={s.meta}>
              <div style={s.metaItem}>
                <i className="bi bi-file-text" />
                {kb.document_count ?? 0} docs
              </div>
              <div style={s.metaItem}>
                <i className={`bi bi-${kb.is_public ? "globe" : "lock"}`} />
                {kb.is_public ? "Public" : "Private"}
              </div>
            </div>
          </div>
        ))}

        {list.length === 0 && (
          <div style={{ color: "var(--text-muted)", fontSize: "14px" }}>
            No knowledge bases yet. Create one to power RAG conversations.
          </div>
        )}
      </div>

      {open && (
        <div style={s.modal} onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div style={s.modalBox}>
            <div style={s.modalTitle}>New Knowledge Base</div>
            <div style={s.field}>
              <label style={s.label}>NAME</label>
              <input style={s.input} value={form.name} onChange={set("name")} placeholder="Product Docs" />
            </div>
            <div style={s.field}>
              <label style={s.label}>DESCRIPTION</label>
              <textarea style={s.textarea} value={form.description} onChange={set("description")}
                placeholder="What documents does this knowledge base contain?" />
            </div>
            <div style={s.modalBtns}>
              <button style={s.cancelBtn} onClick={() => setOpen(false)}>Cancel</button>
              <button style={s.saveBtn} onClick={save} disabled={saving}>
                {saving ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}