// components/Sidebar.jsx
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { conversations, folders } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Sidebar({ onNewChat, activeConvId, isCollapsed = false, onToggle }) {
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

  // Helper to check if a nav item is active
  const isNavActive = (path) => {
    if (path === "/") return location.pathname === "/" || location.pathname.startsWith("/chat/");
    return location.pathname === path;
  };

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          <span className="sidebar-logo-text">NeuralChat</span>
        </div>
        <div className="sidebar-header-actions">
          <button className="btn-new-chat" onClick={onNewChat} title="New chat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-section">
          <div className="sidebar-section-label">Menu</div>
          
          {/* Chat Nav Item */}
          <button
            className={`sidebar-conv-item ${isNavActive("/") ? "active" : ""}`}
            onClick={() => navigate("/")}
          >
            <svg className="sidebar-conv-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span className="sidebar-conv-item-title">Chat</span>
          </button>

          {/* Agents Nav Item */}
          <button
            className={`sidebar-conv-item ${isNavActive("/agents") ? "active" : ""}`}
            onClick={() => navigate("/agents")}
          >
            <svg className="sidebar-conv-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 8V4M8 12H4M16 12H20M12 16V20M8 20L16 4M8 4L16 20"/>
              <circle cx="12" cy="12" r="2"/>
            </svg>
            <span className="sidebar-conv-item-title">Agents</span>
          </button>

          {/* Knowledge Nav Item */}
          <button
            className={`sidebar-conv-item ${isNavActive("/knowledge") ? "active" : ""}`}
            onClick={() => navigate("/knowledge")}
          >
            <svg className="sidebar-conv-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            <span className="sidebar-conv-item-title">Knowledge</span>
          </button>

          {/* Usage Nav Item */}
          <button
            className={`sidebar-conv-item ${isNavActive("/usage") ? "active" : ""}`}
            onClick={() => navigate("/usage")}
          >
            <svg className="sidebar-conv-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3M12 2v12m0 0-3-3m3 3 3-3"/>
            </svg>
            <span className="sidebar-conv-item-title">Usage</span>
          </button>

          {/* Settings Nav Item */}
          <button
            className={`sidebar-conv-item ${isNavActive("/settings") ? "active" : ""}`}
            onClick={() => navigate("/settings")}
          >
            <svg className="sidebar-conv-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span className="sidebar-conv-item-title">Settings</span>
          </button>
        </div>

        {/* Pinned Conversations */}
        {pinned.length > 0 && (
          <div className="sidebar-section">
            <div className="sidebar-section-label">Pinned</div>
            {pinned.map(c => (
              <button
                key={c.id}
                className={`sidebar-conv-item ${c.id === activeConvId ? "active" : ""}`}
                onClick={() => handleConvClick(c.id)}
              >
                <svg className="sidebar-conv-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
                <span className="sidebar-conv-item-title">{c.title || "Untitled"}</span>
                <div className="sidebar-conv-item-fade" />
                <div className="sidebar-conv-item-actions">
                  <button className="sidebar-conv-item-action-btn" title="Pin">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                  </button>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Recent Conversations */}
        <div className="sidebar-section">
          <div className="sidebar-section-label">Recent</div>
          {unpinned.map(c => (
            <button
              key={c.id}
              className={`sidebar-conv-item ${c.id === activeConvId ? "active" : ""}`}
              onClick={() => handleConvClick(c.id)}
            >
              <svg className="sidebar-conv-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <span className="sidebar-conv-item-title">{c.title || "Untitled"}</span>
              <div className="sidebar-conv-item-fade" />
              <div className="sidebar-conv-item-actions">
                <button className="sidebar-conv-item-action-btn" title="Rename">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 3l4 4-7 7H10v-4l7-7zM4 20h16"/>
                  </svg>
                </button>
                <button className="sidebar-conv-item-action-btn" title="Delete">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 7h16M10 11v6M14 11v6M5 7l1 13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-13M9 4h6"/>
                  </svg>
                </button>
              </div>
            </button>
          ))}

          {convs.length === 0 && (
            <div className="empty-state" style={{ padding: "var(--space-8) var(--space-4)", textAlign: "center" }}>
              <div className="empty-state-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div className="empty-state-title">No conversations yet</div>
              <div className="empty-state-desc">Start a new chat to begin</div>
            </div>
          )}
        </div>
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <button className="sidebar-user-btn" onClick={logout}>
          <div className="sidebar-user-avatar">
            {user?.email?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.username || user?.first_name || "User"}</div>
            <div className="sidebar-user-plan">{user?.email}</div>
          </div>
          <svg className="sidebar-user-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </button>
      </div>
    </aside>
  );
}