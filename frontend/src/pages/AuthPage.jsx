// pages/AuthPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const s = {
  page: {
    minHeight: "100vh", width: "100%",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "var(--bg)",
    backgroundImage: "radial-gradient(ellipse 80% 50% at 50% -20%, #7c6aff22, transparent)",
  },
  card: {
    width: "100%", maxWidth: "400px",
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: "20px", padding: "40px",
    boxShadow: "0 24px 64px #0008",
  },
  logo: {
    textAlign: "center", marginBottom: "32px",
  },
  logoMark: {
    width: "52px", height: "52px", borderRadius: "14px",
    background: "linear-gradient(135deg, var(--accent), #a78bfa)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "24px", margin: "0 auto 12px",
  },
  logoText: {
    fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "22px",
    color: "var(--text)",
  },
  subtitle: { fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" },
  tabs: {
    display: "flex", gap: "4px",
    background: "var(--surface2)", borderRadius: "10px",
    padding: "4px", marginBottom: "24px",
  },
  tab: (active) => ({
    flex: 1, padding: "8px", borderRadius: "7px", border: "none",
    cursor: "pointer", fontSize: "13px", fontWeight: 600,
    background: active ? "var(--accent)" : "transparent",
    color: active ? "#fff" : "var(--text-muted)",
    transition: "all .2s",
  }),
  field: { marginBottom: "14px" },
  label: {
    fontSize: "12px", fontWeight: 600, color: "var(--text-muted)",
    display: "block", marginBottom: "6px", letterSpacing: ".5px",
  },
  input: {
    width: "100%", background: "var(--surface2)",
    border: "1px solid var(--border)", borderRadius: "10px",
    padding: "10px 14px", color: "var(--text)", fontSize: "14px",
    fontFamily: "'Syne', sans-serif", outline: "none",
    transition: "border-color .2s",
  },
  btn: {
    width: "100%", padding: "12px",
    background: "var(--accent)", border: "none", borderRadius: "10px",
    color: "#fff", fontSize: "14px", fontWeight: 700,
    cursor: "pointer", marginTop: "8px",
    fontFamily: "'Syne', sans-serif",
    transition: "opacity .15s",
  },
  error: {
    background: "#f8717122", border: "1px solid #f87171",
    borderRadius: "8px", padding: "10px 14px",
    fontSize: "13px", color: "#f87171", marginBottom: "14px",
  },
};

export default function AuthPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", password2: "", username: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setError(""); setLoading(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        if (form.password !== form.password2) throw new Error("Passwords do not match.");
        await register(form);
      }
      navigate("/");
    } catch (err) {
      setError(err.data ? JSON.stringify(err.data) : err.message);
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e) => { if (e.key === "Enter") submit(); };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>
          <div style={s.logoMark}>✦</div>
          <div style={s.logoText}>NeuralChat</div>
          <div style={s.subtitle}>AI-powered conversations</div>
        </div>

        <div style={s.tabs}>
          <button style={s.tab(mode === "login")}    onClick={() => { setMode("login");    setError(""); }}>Sign In</button>
          <button style={s.tab(mode === "register")} onClick={() => { setMode("register"); setError(""); }}>Register</button>
        </div>

        {error && <div style={s.error}>{error}</div>}

        {mode === "register" && (
          <div style={s.field}>
            <label style={s.label}>USERNAME</label>
            <input style={s.input} value={form.username} onChange={set("username")} onKeyDown={onKey} placeholder="your_handle" />
          </div>
        )}

        <div style={s.field}>
          <label style={s.label}>EMAIL</label>
          <input style={s.input} type="email" value={form.email} onChange={set("email")} onKeyDown={onKey} placeholder="you@example.com" />
        </div>

        <div style={s.field}>
          <label style={s.label}>PASSWORD</label>
          <input style={s.input} type="password" value={form.password} onChange={set("password")} onKeyDown={onKey} placeholder="••••••••" />
        </div>

        {mode === "register" && (
          <div style={s.field}>
            <label style={s.label}>CONFIRM PASSWORD</label>
            <input style={s.input} type="password" value={form.password2} onChange={set("password2")} onKeyDown={onKey} placeholder="••••••••" />
          </div>
        )}

        <button style={{ ...s.btn, opacity: loading ? .6 : 1 }} onClick={submit} disabled={loading}>
          {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
        </button>
      </div>
    </div>
  );
}