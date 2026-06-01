// pages/AuthPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/* Bootstrap Icons — loaded via CDN in index.html:
   <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"> */

export default function AuthPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", password2: "", username: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setError("");
    setLoading(true);
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

  const onKey = (e) => {
    if (e.key === "Enter") submit();
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError("");
    setShowPassword(false);
    setShowPassword2(false);
    setForm({ email: "", password: "", password2: "", username: "" });
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* ── Logo ── */}
        <div className="auth-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>

        <h1 className="auth-heading">humanAI</h1>
        <p className="auth-subheading">AI-powered conversations</p>

        {/* ── Tab Switcher ── */}
        <div className="tabs-pill">
          <button
            className={`tab-pill${mode === "login" ? " active" : ""}`}
            onClick={() => switchMode("login")}
            type="button"
          >
            Sign In
          </button>
          <button
            className={`tab-pill${mode === "register" ? " active" : ""}`}
            onClick={() => switchMode("register")}
            type="button"
          >
            Register
          </button>
        </div>

        {/* ── Error Banner ── */}
        {error && (
          <div className="auth-error">
            <i className="bi bi-exclamation-circle" style={{ marginRight: 6 }} />
            {error}
          </div>
        )}

        {/* ── Form ── */}
        <form
          className="auth-form"
          onSubmit={(e) => { e.preventDefault(); submit(); }}
        >

          {/* Username — register only */}
          {mode === "register" && (
            <div className="form-group">
              <label className="form-label">USERNAME</label>
              <input
                className="input"
                type="text"
                value={form.username}
                onChange={set("username")}
                onKeyDown={onKey}
                placeholder="your_handle"
                autoComplete="username"
              />
              <span className="form-hint">This will be your display name</span>
            </div>
          )}

          {/* Email */}
          <div className="form-group">
            <label className="form-label">EMAIL</label>
            <div style={{ position: "relative" }}>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={set("email")}
                onKeyDown={onKey}
                placeholder="you@example.com"
                autoComplete="email"
                required
                style={{ paddingRight: 42 }}
              />
              <span style={iconWrapStyle}>
                <i className="bi bi-envelope" style={trailingIconStyle} />
              </span>
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label">PASSWORD</label>
            <div style={{ position: "relative" }}>
              <input
                className="input"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={set("password")}
                onKeyDown={onKey}
                placeholder="••••••••"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                style={{ paddingRight: 42 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={eyeBtnStyle}
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={0}
              >
                <i
                  className={showPassword ? "bi bi-eye-slash" : "bi bi-eye"}
                  style={eyeIconStyle}
                />
              </button>
            </div>
            {mode === "register" && (
              <span className="form-hint">At least 8 characters</span>
            )}
          </div>

          {/* Confirm Password — register only */}
          {mode === "register" && (
            <div className="form-group">
              <label className="form-label">CONFIRM PASSWORD</label>
              <div style={{ position: "relative" }}>
                <input
                  className="input"
                  type={showPassword2 ? "text" : "password"}
                  value={form.password2}
                  onChange={set("password2")}
                  onKeyDown={onKey}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                  style={{ paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword2((v) => !v)}
                  style={eyeBtnStyle}
                  aria-label={showPassword2 ? "Hide password" : "Show password"}
                  tabIndex={0}
                >
                  <i
                    className={showPassword2 ? "bi bi-eye-slash" : "bi bi-eye"}
                    style={eyeIconStyle}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Forgot password — login only */}
          {mode === "login" && (
            <div style={{ textAlign: "right", marginTop: -8 }}>
              <a
                href="#"
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--text-muted)",
                  textDecoration: "underline",
                  textUnderlineOffset: 2,
                }}
              >
                Forgot password?
              </a>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-brand btn-md"
            disabled={loading}
            style={{ width: "100%", marginTop: "var(--space-2)", gap: 8 }}
          >
            {loading ? (
              <>
                <span className="spinner spinner-sm" />
                Please wait…
              </>
            ) : mode === "login" ? (
              <>
                <i className="bi bi-box-arrow-in-right" />
                Sign In
              </>
            ) : (
              <>
                <i className="bi bi-person-plus" />
                Create Account
              </>
            )}
          </button>
        </form>

        {/* ── Divider ── */}
        <div className="divider-text" style={{ margin: "var(--space-6) 0" }}>
          <span>OR</span>
        </div>

        {/* ── Social Login ── */}
        <button className="auth-social-btn" type="button">
          {/* Google SVG */}
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        {/* ── Footer ── */}
        <div className="auth-form-footer">
          {mode === "login" ? (
            <p>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("register")}
                style={{ background: "none", border: "none", cursor: "pointer", display: "inline", padding: 0 }}
              >
                Sign up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("login")}
                style={{ background: "none", border: "none", cursor: "pointer", display: "inline", padding: 0 }}
              >
                Sign in
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
}

/* ── Shared inline styles for password eye toggle ── */

const eyeBtnStyle = {
  position: "absolute",
  right: 0,
  top: 0,
  height: "100%",
  width: 42,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "var(--text-muted)",
  borderRadius: "0 var(--radius-md) var(--radius-md) 0",
  transition: "color var(--transition-fast)",
  padding: 0,
};

const eyeIconStyle = {
  fontSize: 16,
  lineHeight: 1,
  transition: "color var(--transition-fast)",
};

const iconWrapStyle = {
  position: "absolute",
  right: 0,
  top: 0,
  height: "100%",
  width: 42,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  pointerEvents: "none",
};

const trailingIconStyle = {
  fontSize: 15,
  color: "var(--text-muted)",
};