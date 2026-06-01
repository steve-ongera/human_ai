// App.jsx
import { useState } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Sidebar       from "./components/Sidebar";
import AuthPage      from "./pages/AuthPage";
import ChatPage      from "./pages/ChatPage";
import AgentsPage    from "./pages/AgentsPage";
import KnowledgePage from "./pages/KnowledgePage";
import UsagePage     from "./pages/UsagePage";
import SettingsPage  from "./pages/SettingsPage";

/* ── Full-screen loading spinner using design tokens ── */
function LoadingScreen() {
  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-app)",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <div className="spinner" />
      <span style={{ fontSize: "var(--font-size-sm)", color: "var(--text-muted)" }}>
        Loading…
      </span>
    </div>
  );
}

/* ── Require auth guard ── */
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? children : <Navigate to="/auth" replace />;
}

/* ── Protected layout: sidebar + main content ── */
function ProtectedLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleNewChat = () => {
    navigate("/");
    setSidebarOpen(false);
  };

  const match = location.pathname.match(/\/chat\/([^/]+)/);
  const activeConvId = match ? match[1] : null;

  return (
    <div className="app">
      <Sidebar
        onNewChat={handleNewChat}
        activeConvId={activeConvId}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="main">
        <Routes>
          <Route path="/"          element={<ChatPage onOpenSidebar={() => setSidebarOpen(true)} />} />
          <Route path="/chat/:id"  element={<ChatPage onOpenSidebar={() => setSidebarOpen(true)} />} />
          <Route path="/agents"    element={<AgentsPage onOpenSidebar={() => setSidebarOpen(true)} />} />
          <Route path="/knowledge" element={<KnowledgePage onOpenSidebar={() => setSidebarOpen(true)} />} />
          <Route path="/usage"     element={<UsagePage onOpenSidebar={() => setSidebarOpen(true)} />} />
          <Route path="/settings"  element={<SettingsPage onOpenSidebar={() => setSidebarOpen(true)} />} />
          <Route path="*"          element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

/* ── Root ── */
export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/auth"
        element={user ? <Navigate to="/" replace /> : <AuthPage />}
      />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <ProtectedLayout />
          </RequireAuth>
        }
      />
    </Routes>
  );
}