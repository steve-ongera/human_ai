// App.jsx
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import AuthPage     from "./pages/AuthPage";
import ChatPage     from "./pages/ChatPage";
import AgentsPage   from "./pages/AgentsPage";
import KnowledgePage from "./pages/KnowledgePage";
import UsagePage    from "./pages/UsagePage";
import SettingsPage from "./pages/SettingsPage";

function ProtectedLayout() {
  const navigate = useNavigate();

  const handleNewChat = () => navigate("/");

  // Derive active conv id from URL
  const path = window.location.pathname;
  const match = path.match(/\/chat\/([^/]+)/);
  const activeConvId = match ? match[1] : null;

  return (
    <div style={{ display: "flex", height: "100vh", width: "100%", overflow: "hidden" }}>
      <Sidebar onNewChat={handleNewChat} activeConvId={activeConvId} />
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <Routes>
          <Route path="/"            element={<ChatPage />} />
          <Route path="/chat/:id"    element={<ChatPage />} />
          <Route path="/agents"      element={<AgentsPage />} />
          <Route path="/knowledge"   element={<KnowledgePage />} />
          <Route path="/usage"       element={<UsagePage />} />
          <Route path="/settings"    element={<SettingsPage />} />
          <Route path="*"            element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{
        height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--bg)", color: "var(--text-muted)", fontSize: "14px",
        gap: "10px",
      }}>
        <i className="bi bi-hourglass-split" />
        Loading…
      </div>
    );
  }
  return user ? children : <Navigate to="/auth" replace />;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
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