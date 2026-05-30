// pages/UsagePage.jsx
import { useState, useEffect } from "react";
import { usage } from "../services/api";

const s = {
  page: { flex: 1, overflowY: "auto", padding: "32px", background: "var(--bg)" },
  title: { fontSize: "22px", fontWeight: 800, color: "var(--text)", marginBottom: "4px" },
  subtitle: { fontSize: "13px", color: "var(--text-muted)", marginBottom: "28px" },
  statsGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: "14px", marginBottom: "28px",
  },
  stat: {
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: "14px", padding: "18px 20px",
  },
  statLabel: { fontSize: "11px", color: "var(--text-muted)", fontWeight: 700, letterSpacing: ".5px", textTransform: "uppercase" },
  statValue: { fontSize: "26px", fontWeight: 800, color: "var(--text)", fontFamily: "'DM Mono', monospace", marginTop: "6px" },
  statSub:   { fontSize: "11px", color: "var(--accent)", marginTop: "2px" },
  table: {
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: "14px", overflow: "hidden", width: "100%",
  },
  tableHead: {
    background: "var(--surface2)", padding: "12px 20px",
    display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr",
    gap: "12px", borderBottom: "1px solid var(--border)",
  },
  thCell: { fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: ".5px", textTransform: "uppercase" },
  row: {
    padding: "12px 20px",
    display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr",
    gap: "12px", borderBottom: "1px solid var(--border)",
    transition: "background .1s",
  },
  cell: { fontSize: "13px", color: "var(--text-muted)", fontFamily: "'DM Mono', monospace" },
  emptyRow: { padding: "32px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" },
};

function fmt(n) { return (n || 0).toLocaleString(); }

export default function UsagePage() {
  const [data, setData]   = useState(null);
  const [loading, setLoad]= useState(true);

  useEffect(() => {
    usage.get().then(setData).catch(() => {}).finally(() => setLoad(false));
  }, []);

  const totals  = data?.totals || {};
  const records = data?.records || [];

  return (
    <div style={s.page}>
      <div style={s.title}>Usage & Analytics</div>
      <div style={s.subtitle}>Token consumption and request stats across all models</div>

      <div style={s.statsGrid}>
        {[
          { label: "Total Tokens",    value: fmt(totals.total_tokens),   sub: "all time" },
          { label: "Total Requests",  value: fmt(totals.total_requests),  sub: "all time" },
          { label: "Days Tracked",    value: fmt(records.length),         sub: "with activity" },
          { label: "Avg / Day",       value: fmt(totals.total_tokens ? Math.round(totals.total_tokens / Math.max(records.length, 1)) : 0), sub: "tokens" },
        ].map(s => (
          <div key={s.label} style={s.stat}>
            <div style={s.statLabel}>{s.label}</div>
            <div style={s.statValue}>{loading ? "—" : s.value}</div>
            <div style={s.statSub}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={s.table}>
        <div style={s.tableHead}>
          {["Date", "Model", "Prompt", "Completion", "Requests"].map(h => (
            <div key={h} style={s.thCell}>{h}</div>
          ))}
        </div>
        {records.length === 0 && !loading && (
          <div style={s.emptyRow}>No usage records yet.</div>
        )}
        {records.map(r => (
          <div key={r.id} style={s.row}>
            <div style={s.cell}>{r.date}</div>
            <div style={s.cell}>{r.model_name || "—"}</div>
            <div style={s.cell}>{fmt(r.prompt_tokens)}</div>
            <div style={s.cell}>{fmt(r.completion_tokens)}</div>
            <div style={s.cell}>{fmt(r.request_count)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}