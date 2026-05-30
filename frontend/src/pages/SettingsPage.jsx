// pages/SettingsPage.jsx
import { useState, useEffect } from "react";
import { preferences, auth } from "../services/api";
import { useAuth } from "../context/AuthContext";

// Toggle component using CSS classes
function Toggle({ value, onChange }) {
  return (
    <label className="toggle">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="toggle-track">
        <span className="toggle-thumb" />
      </span>
    </label>
  );
}

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const [prefs, setPrefs] = useState(null);
  const [profile, setProfile] = useState({ first_name: "", last_name: "", username: "" });
  const [toast, setToast] = useState("");
  const [activeSection, setActiveSection] = useState("profile");

  useEffect(() => {
    preferences.get().then(setPrefs).catch(() => {});
    if (user) setProfile({ 
      first_name: user.first_name || "", 
      last_name: user.last_name || "", 
      username: user.username || "" 
    });
  }, [user]);

  const setPref = k => v => setPrefs(p => ({ ...p, [k]: v }));

  const savePrefs = async () => {
    await preferences.update(prefs).catch(() => {});
    showToast("Preferences saved successfully!");
  };

  const saveProfile = async () => {
    const updated = await auth.updateMe(profile).catch(() => null);
    if (updated) { 
      setUser(updated); 
      showToast("Profile updated successfully!"); 
    }
  };

  const showToast = (msg) => { 
    setToast(msg); 
    setTimeout(() => setToast(""), 2500); 
  };

  if (!prefs) return (
    <div className="main-content">
      <div className="content-area" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="spinner spinner-lg" />
      </div>
    </div>
  );

  return (
    <div className="main-content">
      <div className="content-area">
        <div className="settings-layout">
          {/* Settings Sidebar */}
          <div className="settings-sidebar">
            <div 
              className={`settings-sidebar-item ${activeSection === "profile" ? "active" : ""}`}
              onClick={() => setActiveSection("profile")}
            >
              <i className="bi bi-person-circle" />
              Profile
            </div>
            <div 
              className={`settings-sidebar-item ${activeSection === "appearance" ? "active" : ""}`}
              onClick={() => setActiveSection("appearance")}
            >
              <i className="bi bi-palette" />
              Appearance
            </div>
            <div 
              className={`settings-sidebar-item ${activeSection === "behavior" ? "active" : ""}`}
              onClick={() => setActiveSection("behavior")}
            >
              <i className="bi bi-sliders" />
              Behavior
            </div>
            <div 
              className={`settings-sidebar-item ${activeSection === "data" ? "active" : ""}`}
              onClick={() => setActiveSection("data")}
            >
              <i className="bi bi-database" />
              Data & Privacy
            </div>
            <div 
              className={`settings-sidebar-item ${activeSection === "danger" ? "active" : ""}`}
              onClick={() => setActiveSection("danger")}
            >
              <i className="bi bi-exclamation-triangle" />
              Danger Zone
            </div>
          </div>

          {/* Settings Content */}
          <div className="settings-content">
            {/* Profile Section */}
            {activeSection === "profile" && (
              <div className="settings-section">
                <h2 className="settings-section-title">Profile</h2>
                
                {/* Avatar Preview */}
                <div className="settings-avatar-wrap">
                  <div className="settings-avatar">
                    {profile.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div className="settings-avatar-info">
                    <div className="settings-avatar-name">
                      {profile.first_name || profile.username || "User"}
                    </div>
                    <div className="settings-avatar-email">
                      {user?.email}
                    </div>
                  </div>
                </div>

                {/* Profile Fields */}
                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">Username</div>
                    <div className="settings-row-desc">Your unique handle</div>
                  </div>
                  <div className="settings-row-control">
                    <input
                      className="input"
                      style={{ width: "200px" }}
                      value={profile.username}
                      onChange={e => setProfile(p => ({ ...p, username: e.target.value }))}
                      placeholder="username"
                    />
                  </div>
                </div>

                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">First Name</div>
                    <div className="settings-row-desc">Your given name</div>
                  </div>
                  <div className="settings-row-control">
                    <input
                      className="input"
                      style={{ width: "200px" }}
                      value={profile.first_name}
                      onChange={e => setProfile(p => ({ ...p, first_name: e.target.value }))}
                      placeholder="First name"
                    />
                  </div>
                </div>

                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">Last Name</div>
                    <div className="settings-row-desc">Your family name</div>
                  </div>
                  <div className="settings-row-control">
                    <input
                      className="input"
                      style={{ width: "200px" }}
                      value={profile.last_name}
                      onChange={e => setProfile(p => ({ ...p, last_name: e.target.value }))}
                      placeholder="Last name"
                    />
                  </div>
                </div>

                <button className="btn btn-brand btn-md" onClick={saveProfile} style={{ marginTop: "var(--space-6)" }}>
                  <i className="bi bi-check-lg" />
                  Save Profile
                </button>
              </div>
            )}

            {/* Appearance Section */}
            {activeSection === "appearance" && (
              <div className="settings-section">
                <h2 className="settings-section-title">Appearance</h2>
                
                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">Theme</div>
                    <div className="settings-row-desc">Interface color scheme</div>
                  </div>
                  <div className="settings-row-control">
                    <select 
                      className="select" 
                      value={prefs.theme} 
                      onChange={e => setPref("theme")(e.target.value)}
                      style={{ width: "140px" }}
                    >
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                      <option value="system">System</option>
                    </select>
                  </div>
                </div>

                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">Font Size</div>
                    <div className="settings-row-desc">Text size in chat</div>
                  </div>
                  <div className="settings-row-control">
                    <select 
                      className="select" 
                      value={prefs.font_size} 
                      onChange={e => setPref("font_size")(e.target.value)}
                      style={{ width: "140px" }}
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </div>
                </div>

                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">Compact Mode</div>
                    <div className="settings-row-desc">Reduce spacing between messages</div>
                  </div>
                  <div className="settings-row-control">
                    <Toggle value={prefs.compact_mode} onChange={setPref("compact_mode")} />
                  </div>
                </div>

                <button className="btn btn-brand btn-md" onClick={savePrefs} style={{ marginTop: "var(--space-6)" }}>
                  <i className="bi bi-check-lg" />
                  Save Preferences
                </button>
              </div>
            )}

            {/* Behavior Section */}
            {activeSection === "behavior" && (
              <div className="settings-section">
                <h2 className="settings-section-title">Behavior</h2>
                
                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">Send on Enter</div>
                    <div className="settings-row-desc">Press Enter to send messages</div>
                  </div>
                  <div className="settings-row-control">
                    <Toggle value={prefs.send_on_enter} onChange={setPref("send_on_enter")} />
                  </div>
                </div>

                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">Show Code Line Numbers</div>
                    <div className="settings-row-desc">Display line numbers in code blocks</div>
                  </div>
                  <div className="settings-row-control">
                    <Toggle value={prefs.show_code_line_nums} onChange={setPref("show_code_line_nums")} />
                  </div>
                </div>

                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">Memory Enabled</div>
                    <div className="settings-row-desc">Allow AI to remember context across conversations</div>
                  </div>
                  <div className="settings-row-control">
                    <Toggle value={prefs.memory_enabled} onChange={setPref("memory_enabled")} />
                  </div>
                </div>

                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">Auto-Save Chats</div>
                    <div className="settings-row-desc">Automatically save conversations</div>
                  </div>
                  <div className="settings-row-control">
                    <Toggle value={prefs.auto_save_chats} onChange={setPref("auto_save_chats")} />
                  </div>
                </div>

                <button className="btn btn-brand btn-md" onClick={savePrefs} style={{ marginTop: "var(--space-6)" }}>
                  <i className="bi bi-check-lg" />
                  Save Preferences
                </button>
              </div>
            )}

            {/* Data & Privacy Section */}
            {activeSection === "data" && (
              <div className="settings-section">
                <h2 className="settings-section-title">Data & Privacy</h2>
                
                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">Analytics</div>
                    <div className="settings-row-desc">Help improve with usage data</div>
                  </div>
                  <div className="settings-row-control">
                    <Toggle value={prefs.analytics_opt_in} onChange={setPref("analytics_opt_in")} />
                  </div>
                </div>

                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">Share Conversations</div>
                    <div className="settings-row-desc">Allow sharing of conversations with the community</div>
                  </div>
                  <div className="settings-row-control">
                    <Toggle value={prefs.share_conversations} onChange={setPref("share_conversations")} />
                  </div>
                </div>

                <div className="privacy-block" style={{ marginTop: "var(--space-6)" }}>
                  <div className="privacy-row">
                    <div className="privacy-row-info">
                      <div className="privacy-row-title">Export Data</div>
                      <div className="privacy-row-desc">Download all your conversations and data</div>
                    </div>
                    <button className="btn btn-ghost btn-sm">
                      <i className="bi bi-download" />
                      Export
                    </button>
                  </div>
                  <div className="privacy-row">
                    <div className="privacy-row-info">
                      <div className="privacy-row-title">Delete All Data</div>
                      <div className="privacy-row-desc">Permanently delete all your conversations and settings</div>
                    </div>
                    <button className="btn btn-danger btn-sm">
                      <i className="bi bi-trash" />
                      Delete All
                    </button>
                  </div>
                </div>

                <button className="btn btn-brand btn-md" onClick={savePrefs} style={{ marginTop: "var(--space-6)" }}>
                  <i className="bi bi-check-lg" />
                  Save Preferences
                </button>
              </div>
            )}

            {/* Danger Zone Section */}
            {activeSection === "danger" && (
              <div className="settings-section">
                <h2 className="settings-section-title">Danger Zone</h2>
                
                <div className="privacy-block">
                  <div className="privacy-row">
                    <div className="privacy-row-info">
                      <div className="privacy-row-title">Delete Account</div>
                      <div className="privacy-row-desc">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </div>
                    </div>
                    <button className="btn btn-danger btn-sm">
                      <i className="bi bi-exclamation-triangle" />
                      Delete Account
                    </button>
                  </div>
                  
                  <div className="privacy-row">
                    <div className="privacy-row-info">
                      <div className="privacy-row-title">Sign Out Everywhere</div>
                      <div className="privacy-row-desc">
                        Sign out from all active sessions on all devices
                      </div>
                    </div>
                    <button className="btn btn-ghost btn-sm">
                      <i className="bi bi-box-arrow-right" />
                      Sign Out All
                    </button>
                  </div>
                </div>

                <div style={{ 
                  marginTop: "var(--space-6)", 
                  padding: "var(--space-4)", 
                  background: "rgba(239, 68, 68, 0.1)", 
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid rgba(239, 68, 68, 0.2)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
                    <i className="bi bi-exclamation-triangle-fill" style={{ color: "#f87171" }} />
                    <span style={{ fontWeight: 600, color: "#f87171" }}>Warning</span>
                  </div>
                  <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-gray-400)" }}>
                    These actions are permanent and cannot be undone. Please proceed with caution.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="toast-container">
          <div className="toast toast-success">
            <div className="toast-icon">
              <i className="bi bi-check2-circle" />
            </div>
            <span>{toast}</span>
            <button className="toast-close" onClick={() => setToast("")}>
              <i className="bi bi-x" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}