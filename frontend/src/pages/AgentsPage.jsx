// pages/AgentsPage.jsx
import { useState, useEffect } from "react";
import { agents } from "../services/api";

const ICONS = [
  "bi-robot", "bi-cpu", "bi-lightning-charge", "bi-flask", 
  "bi-book", "bi-lamp", "bi-bullseye", "bi-tools",
  "bi-palette", "bi-graph-up", "bi-wrench", "bi-star",
  "bi-chat-dots", "bi-gem", "bi-cloud", "bi-shield"
];

export default function AgentsPage() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ 
    name: "", 
    description: "", 
    system_prompt: "", 
    icon: "bi-robot", 
    is_public: false 
  });
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
      setForm({ name: "", description: "", system_prompt: "", icon: "bi-robot", is_public: false });
    } catch (err) {
      console.error("Failed to create agent:", err);
    }
    setSave(false);
  };

  const remove = async (id) => {
    if (window.confirm("Are you sure you want to delete this agent?")) {
      await agents.delete(id).catch(() => {});
      setList(prev => prev.filter(a => a.id !== id));
    }
  };

  return (
    <div className="main-content">
      <div className="content-area" style={{ overflowY: "auto" }}>
        {/* Header */}
        <div className="top-header" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
          <div className="header-left">
            <h1 style={{ fontSize: "var(--font-size-xl)", fontWeight: 700, color: "var(--color-gray-100)" }}>
              Agents
            </h1>
            <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-gray-500)", marginTop: "var(--space-1)" }}>
              Custom AI personas with specialized instructions
            </p>
          </div>
          <div className="header-right">
            <button className="btn btn-brand btn-sm" onClick={() => setOpen(true)}>
              <i className="bi bi-plus-lg" style={{ marginRight: "var(--space-1)" }} />
              New Agent
            </button>
          </div>
        </div>

        {/* Agents Grid */}
        <div style={{ padding: "var(--space-6)" }}>
          <div className="cards-grid" style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "var(--space-4)"
          }}>
            {list.map(agent => (
              <div key={agent.id} className="card card-hover">
                <div className="card-header">
                  <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                    <div style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "var(--radius-lg)",
                      background: "linear-gradient(135deg, var(--color-brand), #a78bfa)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "24px",
                      color: "#fff"
                    }}>
                      <i className={agent.avatar_url || agent.icon || "bi-robot"} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: "var(--color-gray-100)", marginBottom: "var(--space-1)" }}>
                        {agent.name}
                      </div>
                      <div className="badge" style={{
                        background: agent.is_public ? "rgba(74, 222, 128, 0.15)" : "rgba(255, 255, 255, 0.08)",
                        color: agent.is_public ? "#4ade80" : "var(--color-gray-400)"
                      }}>
                        <span className="badge-dot" style={{ background: agent.is_public ? "#4ade80" : "var(--color-gray-500)" }} />
                        {agent.is_public ? "PUBLIC" : "PRIVATE"}
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
                    {agent.description || "No description provided"}
                  </p>
                  
                  {agent.system_prompt && (
                    <div style={{
                      background: "rgba(255, 255, 255, 0.04)",
                      borderRadius: "var(--radius-md)",
                      padding: "var(--space-3)",
                      marginTop: "var(--space-3)"
                    }}>
                      <div style={{ 
                        fontSize: "var(--font-size-xs)", 
                        color: "var(--color-gray-500)", 
                        marginBottom: "var(--space-2)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em"
                      }}>
                        <i className="bi bi-file-text" style={{ marginRight: "var(--space-1)" }} />
                        System Prompt
                      </div>
                      <div style={{ 
                        fontSize: "var(--font-size-xs)", 
                        color: "var(--color-gray-400)",
                        lineHeight: "var(--line-height-relaxed)"
                      }}>
                        {agent.system_prompt.length > 120 
                          ? agent.system_prompt.slice(0, 120) + "..." 
                          : agent.system_prompt}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="card-footer">
                  <button 
                    className="btn btn-ghost btn-sm btn-danger"
                    onClick={() => remove(agent.id)}
                    style={{ color: "#f87171", borderColor: "rgba(248, 113, 113, 0.3)" }}
                  >
                    <i className="bi bi-trash" />
                    Delete
                  </button>
                  <button className="btn btn-ghost btn-sm">
                    <i className="bi bi-pencil" />
                    Edit
                  </button>
                  <button className="btn btn-brand btn-sm">
                    <i className="bi bi-chat" />
                    Chat
                  </button>
                </div>
              </div>
            ))}

            {/* Empty State */}
            {list.length === 0 && (
              <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
                <div className="empty-state-icon">
                  <i className="bi bi-robot" style={{ fontSize: "28px" }} />
                </div>
                <div className="empty-state-title">No agents yet</div>
                <div className="empty-state-desc">
                  Create your first custom agent to get started
                </div>
                <button className="btn btn-brand btn-md" onClick={() => setOpen(true)}>
                  <i className="bi bi-plus-lg" /> Create Agent
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Agent Modal */}
      {open && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal modal-md">
            <div className="modal-header">
              <div className="modal-title">
                <i className="bi bi-robot" style={{ marginRight: "var(--space-2)" }} />
                Create New Agent
              </div>
              <button className="modal-close" onClick={() => setOpen(false)}>
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="modal-body">
              {/* Icon Selector */}
              <div className="form-group">
                <label className="form-label">ICON</label>
                <div style={{ 
                  display: "flex", 
                  gap: "var(--space-2)", 
                  flexWrap: "wrap",
                  padding: "var(--space-2)",
                  background: "rgba(255, 255, 255, 0.03)",
                  borderRadius: "var(--radius-md)"
                }}>
                  {ICONS.map(icon => (
                    <button
                      key={icon}
                      onClick={() => setForm(f => ({ ...f, icon }))}
                      className="btn-icon"
                      style={{
                        fontSize: "20px",
                        background: form.icon === icon ? "var(--color-brand-alpha-20)" : "transparent",
                        border: form.icon === icon ? "1px solid var(--color-brand)" : "1px solid transparent",
                        color: form.icon === icon ? "var(--color-brand)" : "var(--color-gray-400)"
                      }}
                    >
                      <i className={icon} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div className="form-group">
                <label className="form-label form-label-required">NAME</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={set("name")}
                  placeholder="e.g., Code Assistant, Writing Coach, etc."
                />
                <span className="form-hint">Give your agent a descriptive name</span>
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label">DESCRIPTION</label>
                <input
                  className="input"
                  value={form.description}
                  onChange={set("description")}
                  placeholder="What does this agent do? (optional)"
                />
              </div>

              {/* System Prompt */}
              <div className="form-group">
                <label className="form-label">SYSTEM PROMPT</label>
                <textarea
                  className="textarea"
                  value={form.system_prompt}
                  onChange={set("system_prompt")}
                  placeholder="You are a helpful assistant that specializes in..."
                  rows={4}
                />
                <span className="form-hint">
                  <i className="bi bi-info-circle" /> Instructions that define the agent's behavior
                </span>
              </div>

              {/* Public/Private Toggle */}
              <div className="form-group">
                <label className="form-label">VISIBILITY</label>
                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">Make agent public</div>
                    <div className="settings-row-desc">Anyone can use this agent</div>
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
                    Create Agent
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