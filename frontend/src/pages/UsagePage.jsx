// pages/UsagePage.jsx
import { useState, useEffect } from "react";
import { usage } from "../services/api";

function fmt(n) { return (n || 0).toLocaleString(); }

export default function UsagePage() {
  const [data, setData] = useState(null);
  const [loading, setLoad] = useState(true);
  const [timeRange, setTimeRange] = useState("7d"); // 7d, 30d, all

  useEffect(() => {
    usage.get({ range: timeRange }).then(setData).catch(() => {}).finally(() => setLoad(false));
  }, [timeRange]);

  const totals = data?.totals || {};
  const records = data?.records || [];

  // Calculate additional stats
  const totalTokens = totals.total_tokens || 0;
  const totalRequests = totals.total_requests || 0;
  const avgTokensPerRequest = totalRequests > 0 ? Math.round(totalTokens / totalRequests) : 0;
  const avgCost = totals.total_cost ? `$${totals.total_cost.toFixed(4)}` : null;

  return (
    <div className="main-content">
      <div className="content-area" style={{ overflowY: "auto" }}>
        {/* Header */}
        <div className="top-header" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
          <div className="header-left">
            <h1 style={{ fontSize: "var(--font-size-xl)", fontWeight: 700, color: "var(--color-gray-100)" }}>
              Usage & Analytics
            </h1>
            <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-gray-500)", marginTop: "var(--space-1)" }}>
              Token consumption and request stats across all models
            </p>
          </div>
          <div className="header-right">
            {/* Time Range Selector */}
            <div className="tabs-pill">
              <button
                className={`tab-pill ${timeRange === "7d" ? "active" : ""}`}
                onClick={() => setTimeRange("7d")}
              >
                Last 7 days
              </button>
              <button
                className={`tab-pill ${timeRange === "30d" ? "active" : ""}`}
                onClick={() => setTimeRange("30d")}
              >
                Last 30 days
              </button>
              <button
                className={`tab-pill ${timeRange === "all" ? "active" : ""}`}
                onClick={() => setTimeRange("all")}
              >
                All time
              </button>
            </div>
          </div>
        </div>

        <div style={{ padding: "var(--space-6)" }}>
          {/* Stats Grid */}
          <div className="cards-grid" style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "var(--space-4)",
            marginBottom: "var(--space-8)"
          }}>
            <div className="card">
              <div className="card-body">
                <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-gray-500)", marginBottom: "var(--space-2)" }}>
                  <i className="bi bi-coin" style={{ marginRight: "var(--space-1)" }} />
                  TOTAL TOKENS
                </div>
                <div style={{ fontSize: "var(--font-size-3xl)", fontWeight: 800, color: "var(--color-gray-100)", fontFamily: "var(--font-mono)" }}>
                  {loading ? "—" : fmt(totalTokens)}
                </div>
                <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-brand)", marginTop: "var(--space-2)" }}>
                  all time
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-gray-500)", marginBottom: "var(--space-2)" }}>
                  <i className="bi bi-envelope-paper" style={{ marginRight: "var(--space-1)" }} />
                  TOTAL REQUESTS
                </div>
                <div style={{ fontSize: "var(--font-size-3xl)", fontWeight: 800, color: "var(--color-gray-100)", fontFamily: "var(--font-mono)" }}>
                  {loading ? "—" : fmt(totalRequests)}
                </div>
                <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-gray-500)", marginTop: "var(--space-2)" }}>
                  API calls made
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-gray-500)", marginBottom: "var(--space-2)" }}>
                  <i className="bi bi-bar-chart-steps" style={{ marginRight: "var(--space-1)" }} />
                  AVG TOKENS / REQUEST
                </div>
                <div style={{ fontSize: "var(--font-size-3xl)", fontWeight: 800, color: "var(--color-gray-100)", fontFamily: "var(--font-mono)" }}>
                  {loading ? "—" : fmt(avgTokensPerRequest)}
                </div>
                <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-gray-500)", marginTop: "var(--space-2)" }}>
                  per conversation turn
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-gray-500)", marginBottom: "var(--space-2)" }}>
                  <i className="bi bi-calendar" style={{ marginRight: "var(--space-1)" }} />
                  DAYS WITH ACTIVITY
                </div>
                <div style={{ fontSize: "var(--font-size-3xl)", fontWeight: 800, color: "var(--color-gray-100)", fontFamily: "var(--font-mono)" }}>
                  {loading ? "—" : fmt(records.length)}
                </div>
                <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-gray-500)", marginTop: "var(--space-2)" }}>
                  active days
                </div>
              </div>
            </div>

            {avgCost && (
              <div className="card">
                <div className="card-body">
                  <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-gray-500)", marginBottom: "var(--space-2)" }}>
                    <i className="bi bi-currency-dollar" style={{ marginRight: "var(--space-1)" }} />
                    ESTIMATED COST
                  </div>
                  <div style={{ fontSize: "var(--font-size-3xl)", fontWeight: 800, color: "var(--color-gray-100)", fontFamily: "var(--font-mono)" }}>
                    {avgCost}
                  </div>
                  <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-gray-500)", marginTop: "var(--space-2)" }}>
                    based on token usage
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Usage Table */}
          <div className="card" style={{ overflow: "hidden" }}>
            <div className="card-header">
              <div className="card-title">
                <i className="bi bi-table" style={{ marginRight: "var(--space-2)" }} />
                Usage History
              </div>
              <div className="badge badge-gray">
                <i className="bi bi-clock" style={{ marginRight: "var(--space-1)" }} />
                {records.length} records
              </div>
            </div>
            
            <div style={{ overflowX: "auto" }}>
              <table className="message-content" style={{ width: "100%", margin: 0 }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Model</th>
                    <th>Prompt Tokens</th>
                    <th>Completion Tokens</th>
                    <th>Total Tokens</th>
                    <th>Requests</th>
                  </tr>
                </thead>
                <tbody>
                  {records.length === 0 && !loading && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", padding: "var(--space-8)" }}>
                        <div className="empty-state" style={{ padding: 0 }}>
                          <div className="empty-state-icon">
                            <i className="bi bi-graph-up" style={{ fontSize: "32px" }} />
                          </div>
                          <div className="empty-state-title">No usage records yet</div>
                          <div className="empty-state-desc">
                            Start using the chat to see your usage statistics
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  {records.map((r, idx) => (
                    <tr key={r.id || idx}>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <i className="bi bi-calendar3" style={{ marginRight: "var(--space-2)", color: "var(--color-gray-600)" }} />
                        {r.date}
                      </td>
                      <td>
                        <span className="badge badge-gray">
                          {r.model_name || "Unknown"}
                        </span>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)" }}>{fmt(r.prompt_tokens)}</td>
                      <td style={{ fontFamily: "var(--font-mono)" }}>{fmt(r.completion_tokens)}</td>
                      <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--color-gray-200)" }}>
                        {fmt(r.total_tokens || (r.prompt_tokens + r.completion_tokens))}
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)" }}>{fmt(r.request_count)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table Footer with Summary */}
            {records.length > 0 && !loading && (
              <div className="card-footer" style={{ justifyContent: "space-between" }}>
                <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-gray-500)" }}>
                  <i className="bi bi-info-circle" style={{ marginRight: "var(--space-1)" }} />
                  Token counts may vary based on model and encoding
                </div>
                <div className="badge badge-brand">
                  <i className="bi bi-calculator" style={{ marginRight: "var(--space-1)" }} />
                  Total: {fmt(totalTokens)} tokens
                </div>
              </div>
            )}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="card" style={{ marginTop: "var(--space-4)" }}>
              <div className="card-body" style={{ textAlign: "center", padding: "var(--space-8)" }}>
                <div className="spinner spinner-lg" style={{ margin: "0 auto var(--space-4)" }} />
                <div style={{ color: "var(--color-gray-500)" }}>Loading usage data...</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}