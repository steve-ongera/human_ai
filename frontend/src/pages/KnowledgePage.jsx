// pages/KnowledgePage.jsx
import { useState, useEffect } from "react";
import { knowledgeBases } from "../services/api";

export default function KnowledgePage() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", is_public: false });
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
    } catch (err) {
      console.error("Failed to create knowledge base:", err);
    }
    setSave(false);
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      await knowledgeBases.delete(id).catch(() => {});
      setList(prev => prev.filter(kb => kb.id !== id));
    }
  };

  return (
    <div className="main-content">
      <div className="content-area" style={{ overflowY: "auto" }}>
        {/* Header */}
        <div className="top-header" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
          <div className="header-left">
            <h1 style={{ fontSize: "var(--font-size-xl)", fontWeight: 700, color: "var(--color-gray-100)" }}>
              Knowledge Bases
            </h1>
            <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-gray-500)", marginTop: "var(--space-1)" }}>
              Document stores for retrieval-augmented generation
            </p>
          </div>
          <div className="header-right">
            <button className="btn btn-brand btn-sm" onClick={() => setOpen(true)}>
              <i className="bi bi-plus-lg" style={{ marginRight: "var(--space-1)" }} />
              New Knowledge Base
            </button>
          </div>
        </div>

        {/* Knowledge Bases Grid */}
        <div style={{ padding: "var(--space-6)" }}>
          <div className="cards-grid" style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "var(--space-4)"
          }}>
            {list.map(kb => (
              <div key={kb.id} className="card card-hover">
                <div className="card-header">
                  <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                    <div style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "var(--radius-lg)",
                      background: "linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(59, 130, 246, 0.2))",
                      border: "1px solid rgba(6, 182, 212, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "22px",
                      color: "#06b6d4"
                    }}>
                      <i className="bi bi-journal-bookmark-fill" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: "var(--color-gray-100)", marginBottom: "var(--space-1)" }}>
                        {kb.name}
                      </div>
                      <div className="badge" style={{
                        background: kb.is_public ? "rgba(74, 222, 128, 0.15)" : "rgba(255, 255, 255, 0.08)",
                        color: kb.is_public ? "#4ade80" : "var(--color-gray-400)"
                      }}>
                        <span className="badge-dot" style={{ background: kb.is_public ? "#4ade80" : "var(--color-gray-500)" }} />
                        <i className={`bi bi-${kb.is_public ? "globe" : "lock"}`} style={{ marginRight: "4px" }} />
                        {kb.is_public ? "Public" : "Private"}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="card-body">
                  <p style={{ 
                    fontSize: "var(--font-size-sm)", 
                    color: "var(--color-gray-400)",
                    lineHeight: "var(--line-height-relaxed)",
                    marginBottom: "var(--space-4)"
                  }}>
                    {kb.description || "No description provided"}
                  </p>
                  
                  {/* Stats */}
                  <div style={{
                    display: "flex",
                    gap: "var(--space-4)",
                    padding: "var(--space-3)",
                    background: "rgba(255, 255, 255, 0.03)",
                    borderRadius: "var(--radius-md)",
                    marginBottom: "var(--space-4)"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                      <i className="bi bi-file-text" style={{ color: "var(--color-gray-500)" }} />
                      <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-gray-300)" }}>
                        {kb.document_count ?? 0} documents
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                      <i className="bi bi-database" style={{ color: "var(--color-gray-500)" }} />
                      <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-gray-300)" }}>
                        {kb.total_chunks ?? 0} chunks
                      </span>
                    </div>
                  </div>

                  {/* Last updated */}
                  {kb.updated_at && (
                    <div style={{ 
                      fontSize: "var(--font-size-xs)", 
                      color: "var(--color-gray-600)",
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-2)"
                    }}>
                      <i className="bi bi-clock" />
                      Updated {new Date(kb.updated_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
                
                <div className="card-footer">
                  <button 
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDelete(kb.id, kb.name)}
                    style={{ color: "#f87171", borderColor: "rgba(248, 113, 113, 0.3)" }}
                  >
                    <i className="bi bi-trash" />
                    Delete
                  </button>
                  <button className="btn btn-ghost btn-sm">
                    <i className="bi bi-upload" />
                    Upload Docs
                  </button>
                  <button className="btn btn-brand btn-sm">
                    <i className="bi bi-search" />
                    Query
                  </button>
                </div>
              </div>
            ))}

            {/* Empty State */}
            {list.length === 0 && (
              <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
                <div className="empty-state-icon">
                  <i className="bi bi-journal-bookmark" style={{ fontSize: "32px" }} />
                </div>
                <div className="empty-state-title">No knowledge bases yet</div>
                <div className="empty-state-desc">
                  Create a knowledge base to store documents and enable RAG-powered conversations
                </div>
                <button className="btn btn-brand btn-md" onClick={() => setOpen(true)}>
                  <i className="bi bi-plus-lg" /> Create Knowledge Base
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Knowledge Base Modal */}
      {open && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal modal-md">
            <div className="modal-header">
              <div className="modal-title">
                <i className="bi bi-journal-bookmark-fill" style={{ marginRight: "var(--space-2)", color: "var(--color-brand)" }} />
                Create Knowledge Base
              </div>
              <button className="modal-close" onClick={() => setOpen(false)}>
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="modal-body">
              {/* Name */}
              <div className="form-group">
                <label className="form-label form-label-required">NAME</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={set("name")}
                  placeholder="e.g., Product Documentation, Company Policies, etc."
                  autoFocus
                />
                <span className="form-hint">Give your knowledge base a descriptive name</span>
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label">DESCRIPTION</label>
                <textarea
                  className="textarea"
                  value={form.description}
                  onChange={set("description")}
                  placeholder="What kind of documents will this knowledge base contain? (optional)"
                  rows={3}
                />
              </div>

              {/* Public/Private Toggle */}
              <div className="form-group">
                <label className="form-label">VISIBILITY</label>
                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">Make knowledge base public</div>
                    <div className="settings-row-desc">Anyone can access and query this knowledge base</div>
                  </div>
                  <div className="settings-row-control">
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={form.is_public}
                        onChange={(e) => setForm(f => ({ ...f, is_public: e.target.checked }))}
                      />
                      <span className="toggle-track">
                        <span className="toggle-thumb" />
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div style={{
                background: "var(--color-brand-alpha-10)",
                border: "1px solid var(--color-brand-alpha-20)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-3)",
                marginTop: "var(--space-4)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
                  <i className="bi bi-info-circle" style={{ color: "var(--color-brand)" }} />
                  <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--color-gray-200)" }}>
                    What is a Knowledge Base?
                  </span>
                </div>
                <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-gray-400)", lineHeight: "var(--line-height-relaxed)" }}>
                  A knowledge base stores documents that your AI can reference when answering questions. 
                  Upload PDFs, text files, or markdown documents to enable retrieval-augmented generation (RAG).
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost btn-md" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button 
                className="btn btn-brand btn-md" 
                onClick={save} 
                disabled={saving || !form.name.trim()}
              >
                {saving ? (
                  <>
                    <span className="spinner spinner-sm" />
                    Creating...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-lg" />
                    Create Knowledge Base
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}