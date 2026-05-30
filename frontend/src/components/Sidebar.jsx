// components/Sidebar.jsx
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { conversations, folders } from "../services/api";
import { useAuth } from "../context/AuthContext";

const s = {
  sidebar: {
    width: "260px", minWidth: "260px", height: "100vh",
    background: "var(--surface)", borderRight: "1px solid var(--border)",
    display: "flex", flexDirection: "column", overflow: "hidden",
  },
  header: {
    padding: "20px 16px 12px",
    borderBottom: "1px solid var(--border)",
    display: "flex", alignItems: "center", justifyContent: "space-between",
  },
  logo: {
    fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "18px",
    color: "var(--text)", display: "flex", alignItems: "center", gap: "8px",
  },
  logoIcon: {
    width: "28px", height: "28px",
    background: "linear-gradient(135deg, var(--accent), #a78bfa)",
    borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "14px",
  },
  newBtn: {
    background: "var(--accent)", border: "none", color: "#fff",
    width: "30px", height: "30px", borderRadius: "8px", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "18px", transition: "opacity .15s",
  },
  nav: {
    padding: "8px",
    borderBottom: "1px solid var(--border)",
  },
  navItem: (active) => ({
    display: "flex", alignItems: "center", gap: "10px",
    padding: "8px 10px", borderRadius: "8px", cursor: "pointer",
    color: active ? "var(--text)" : "var(--text-muted)",
    background: active ? "var(--surface2)" : "transparent",
    fontSize: "13px", fontWeight: active ? 600 : 400,
    transition: "all .15s", border: "none", width: "100%", textAlign: "left",
  }),
  convList: { flex: 1, overflowY: "auto", padding: "8px" },
  sectionLabel: {
    fontSize: "10px", fontWeight: 700, color: "var(--text-muted)",
    letterSpacing: "1px", textTransform: "uppercase",
    padding: "8px 10px 4px",
  },
  convItem: (active) => ({
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "8px 10px", borderRadius: "8px", cursor: "pointer",
    background: active ? "var(--surface2)" : "transparent",
    color: active ? "var(--text)" : "var(--text-muted)",
    transition: "all .15s", fontSize: "13px",
    border: "none", width: "100%", textAlign: "left",
  }),
  convTitle: {
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    maxWidth: "160px",
  },
  footer: {
    padding: "12px", borderTop: "1px solid var(--border)",
    display: "flex", alignItems: "center", gap: "10px",
  },
  avatar: {
    width: "32px", height: "32px", borderRadius: "50%",
    background: "linear-gradient(135deg, var(--accent), #a78bfa)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "13px", fontWeight: 700, color: "#fff", flexShrink: 0,
  },
  userInfo: { flex: 1, overflow: "hidden" },
  userName: { fontSize: "13px", fontWeight: 600, color: "var(--text)" },
  userEmail: { fontSize: "11px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  settingsBtn: {
    background: "none", border: "none", cursor: "pointer",
    color: "var(--text-muted)", fontSize: "16px",
  },
};

const NAV_ITEMS = [
  { icon: "bi-chat-dots",      label: "Chat",       path: "/" },
  { icon: "bi-robot",          label: "Agents",     path: "/agents" },
  { icon: "bi-book",           label: "Knowledge",  path: "/knowledge" },
  { icon: "bi-bar-chart-line", label: "Usage",      path: "/usage" },
  { icon: "bi-gear",           label: "Settings",   path: "/settings" },
];

export default function Sidebar({ onNewChat, activeConvId }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [convs, setConvs] = useState([]);

  useEffect(() => {
    conversations.list({ archived: "false" }).then(r => {
      setConvs(Array.isArray(r) ? r : r.results || []);
    }).catch(() => {});
  }, [activeConvId]);

  const pinned   = convs.filter(c => c.is_pinned);
  const unpinned = convs.filter(c => !c.is_pinned);

  const handleConvClick = (id) => navigate(`/chat/${id}`);

  return (
    <div style={s.sidebar}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.logo}>
          <div style={s.logoIcon}>✦</div>
          NeuralChat
        </div>
        <button style={s.newBtn} onClick={onNewChat} title="New chat">
          <i className="bi bi-plus" />
        </button>
      </div>

      {/* Nav */}
      <div style={s.nav}>
        {NAV_ITEMS.map(item => (
          <button
            key={item.path}
            style={s.navItem(location.pathname === item.path)}
            onClick={() => navigate(item.path)}
          >
            <i className={`bi ${item.icon}`} />
            {item.label}
          </button>
        ))}
      </div>

      {/* Conversation list */}
      <div style={s.convList}>
        {pinned.length > 0 && (
          <>
            <div style={s.sectionLabel}>Pinned</div>
            {pinned.map(c => (
              <button
                key={c.id}
                style={s.convItem(c.id === activeConvId)}
                onClick={() => handleConvClick(c.id)}
              >
                <span style={s.convTitle}>
                  <i className="bi bi-pin-angle-fill" style={{ marginRight: 5, fontSize: 10 }} />
                  {c.title || "Untitled"}
                </span>
              </button>
            ))}
          </>
        )}

        <div style={s.sectionLabel}>Recent</div>
        {unpinned.map(c => (
          <button
            key={c.id}
            style={s.convItem(c.id === activeConvId)}
            onClick={() => handleConvClick(c.id)}
          >
            <span style={s.convTitle}>{c.title || "Untitled"}</span>
          </button>
        ))}

        {convs.length === 0 && (
          <div style={{ color: "var(--text-muted)", fontSize: "12px", padding: "12px 10px", textAlign: "center" }}>
            No conversations yet.<br />Start a new chat!
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={s.footer}>
        <div style={s.avatar}>
          {user?.email?.[0]?.toUpperCase() || "U"}
        </div>
        <div style={s.userInfo}>
          <div style={s.userName}>{user?.username || user?.first_name || "User"}</div>
          <div style={s.userEmail}>{user?.email}</div>
        </div>
        <button style={s.settingsBtn} onClick={logout} title="Logout">
          <i className="bi bi-box-arrow-right" />
        </button>
      </div>
    </div>
  );
}