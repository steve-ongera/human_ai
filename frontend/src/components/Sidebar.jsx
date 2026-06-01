// components/Sidebar.jsx
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { conversations } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Sidebar({ onNewChat, activeConvId, isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const location         = useLocation();
  const [convs, setConvs]   = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    conversations
      .list({ archived: "false" })
      .then((r) => setConvs(Array.isArray(r) ? r : r.results || []))
      .catch(() => {});
  }, [activeConvId]);

  const pinned   = convs.filter((c) =>  c.is_pinned);
  const unpinned = convs.filter((c) => !c.is_pinned);

  const filtered = (list) =>
    search.trim()
      ? list.filter((c) =>
          (c.title || "Untitled").toLowerCase().includes(search.toLowerCase())
        )
      : list;

  const isNavActive = (path) => {
    if (path === "/") return location.pathname === "/" || location.pathname.startsWith("/chat/");
    return location.pathname === path;
  };

  const handleConvClick = (id) => { navigate(`/chat/${id}`); onClose?.(); };
  const handleNavClick  = (path) => { navigate(path); onClose?.(); };

  /* ── Nav items config ── */
  const navItems = [
    {
      path: "/",
      label: "Chat",
      icon: <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />,
    },
    {
      path: "/agents",
      label: "Agents",
      icon: (
        <>
          <circle cx="12" cy="12" r="2" />
          <path d="M12 8V4M8 12H4M16 12H20M12 16V20" />
        </>
      ),
    },
    {
      path: "/knowledge",
      label: "Knowledge",
      icon: <path d="M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />,
    },
    {
      path: "/usage",
      label: "Usage",
      icon: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
    },
    {
      path: "/settings",
      label: "Settings",
      icon: (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </>
      ),
    },
  ];

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`mobile-overlay${isOpen ? " show" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`sidebar${isOpen ? " open" : ""}`}
        aria-label="Navigation"
      >
        {/* ── Top bar ── */}
        <div className="sidebar-top">
          <a
            href="/"
            className="sidebar-logo"
            onClick={(e) => { e.preventDefault(); handleNavClick("/"); }}
            aria-label="Home"
          >
            <div className="logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="logo-text">humanAI</span>
          </a>

          <button
            className="icon-btn"
            onClick={() => { onNewChat?.(); onClose?.(); }}
            title="New chat"
            aria-label="New chat"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

        {/* ── Search ── */}
        <div className="sidebar-search">
          <div className="search-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              className="search-input"
              type="text"
              placeholder="Search conversations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search conversations"
            />
          </div>
        </div>

        {/* ── Nav ── */}
        <nav className="sidebar-nav">

          {/* Main menu — each item is a plain <div role="button">, not a <button>,
              so there's no nesting issue when ConvItem action buttons appear below */}
          <div className="nav-section">
            <div className="nav-section-label">Menu</div>

            {navItems.map(({ path, label, icon }) => (
              <div
                key={path}
                className={`conv-item${isNavActive(path) ? " active" : ""}`}
                onClick={() => handleNavClick(path)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && handleNavClick(path)}
              >
                <svg
                  width="15" height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: "var(--text-muted)", flexShrink: 0 }}
                >
                  {icon}
                </svg>
                <span className="conv-title">{label}</span>
                <div className="conv-fade" />
              </div>
            ))}
          </div>

          {/* Pinned conversations */}
          {filtered(pinned).length > 0 && (
            <div className="nav-section">
              <div className="nav-section-label">Pinned</div>
              {filtered(pinned).map((c) => (
                <ConvItem
                  key={c.id}
                  conv={c}
                  active={c.id === activeConvId}
                  onClick={() => handleConvClick(c.id)}
                />
              ))}
            </div>
          )}

          {/* Recent conversations */}
          <div className="nav-section">
            <div className="nav-section-label">Recent</div>
            {filtered(unpinned).length > 0 ? (
              filtered(unpinned).map((c) => (
                <ConvItem
                  key={c.id}
                  conv={c}
                  active={c.id === activeConvId}
                  onClick={() => handleConvClick(c.id)}
                />
              ))
            ) : (
              <div style={{
                padding: "20px 18px",
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: "12.5px",
                lineHeight: 1.6,
              }}>
                {search ? "No results found" : "No conversations yet.\nStart a new chat!"}
              </div>
            )}
          </div>
        </nav>

        {/* ── Upgrade banner ── */}
        <div className="upgrade-card">
          <div className="upgrade-card-title">Upgrade to Pro</div>
          <div className="upgrade-card-desc">
            Unlock advanced models, higher limits, and priority access.
          </div>
          <a href="#" className="upgrade-card-btn" onClick={(e) => e.preventDefault()}>
            Upgrade plan
          </a>
        </div>

        {/* ── Footer / User ── */}
        <div className="sidebar-footer">
          <button className="user-btn" onClick={logout} title="Sign out">
            <div className="user-avatar">
              {user?.email?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="user-info">
              <div className="user-name">
                {user?.username || user?.first_name || "User"}
              </div>
              <div className="user-plan">{user?.email || "Free plan"}</div>
            </div>
            <svg
              className="user-chevron"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </aside>
    </>
  );
}

/* ─────────────────────────────────────────────
   ConvItem
   Uses a <div role="button"> as the outer shell
   so the rename / delete <button> elements inside
   are valid HTML (no <button> inside <button>).
───────────────────────────────────────────── */
function ConvItem({ conv, active, onClick }) {
  return (
    <div
      className={`conv-item${active ? " active" : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
      title={conv.title || "Untitled"}
    >
      {/* Chat bubble icon */}
      <svg
        width="15" height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ color: "var(--text-muted)", flexShrink: 0 }}
      >
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>

      <span className="conv-title">{conv.title || "Untitled"}</span>

      <div className="conv-fade" />

      {/* Action buttons — valid here because the parent is a <div>, not a <button> */}
      <div className="conv-actions">
        <button
          className="conv-action-btn"
          title="Rename"
          onClick={(e) => e.stopPropagation()}
          aria-label="Rename conversation"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z" />
          </svg>
        </button>

        <button
          className="conv-action-btn"
          title="Delete"
          onClick={(e) => e.stopPropagation()}
          aria-label="Delete conversation"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}