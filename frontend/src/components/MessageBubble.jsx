// components/MessageBubble.jsx
import { useState } from "react";
import { messages } from "../services/api";

const s = {
  wrap: (role) => ({
    display: "flex",
    flexDirection: role === "user" ? "row-reverse" : "row",
    gap: "12px",
    alignItems: "flex-start",
    marginBottom: "20px",
    animation: "fadeSlide .25s ease",
  }),
  avatar: (role) => ({
    width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "14px", fontWeight: 700,
    background: role === "user"
      ? "linear-gradient(135deg, #4f46e5, #7c6aff)"
      : "linear-gradient(135deg, #06b6d4, #3b82f6)",
    color: "#fff",
  }),
  bubble: (role) => ({
    maxWidth: "72%",
    padding: "12px 16px",
    borderRadius: role === "user" ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
    background: role === "user" ? "var(--accent)" : "var(--surface2)",
    color: "var(--text)",
    fontSize: "14px",
    lineHeight: "1.65",
    fontFamily: "'Syne', sans-serif",
    border: "1px solid " + (role === "user" ? "transparent" : "var(--border)"),
    position: "relative",
  }),
  code: {
    background: "#0d0d18",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    padding: "12px",
    margin: "8px 0",
    fontFamily: "'DM Mono', monospace",
    fontSize: "12px",
    overflowX: "auto",
    display: "block",
    color: "#a78bfa",
  },
  actions: {
    display: "flex", gap: "6px", marginTop: "8px",
  },
  actionBtn: (active) => ({
    background: "none", border: "none", cursor: "pointer",
    color: active ? "var(--accent)" : "var(--text-muted)",
    fontSize: "13px", padding: "2px 4px", borderRadius: "4px",
    transition: "color .15s",
  }),
  meta: {
    fontSize: "10px", color: "var(--text-muted)",
    marginTop: "4px",
    fontFamily: "'DM Mono', monospace",
  },
};

// Very minimal markdown parser — code blocks + inline code
function renderContent(content) {
  const parts = [];
  let rest = content;
  let key = 0;

  while (rest) {
    const codeIdx = rest.indexOf("```");
    if (codeIdx === -1) {
      parts.push(<span key={key++}>{renderInline(rest)}</span>);
      break;
    }
    if (codeIdx > 0) {
      parts.push(<span key={key++}>{renderInline(rest.slice(0, codeIdx))}</span>);
    }
    const endIdx = rest.indexOf("```", codeIdx + 3);
    if (endIdx === -1) {
      parts.push(<span key={key++}>{renderInline(rest.slice(codeIdx))}</span>);
      break;
    }
    const block = rest.slice(codeIdx + 3, endIdx);
    const newline = block.indexOf("\n");
    const code = newline === -1 ? block : block.slice(newline + 1);
    parts.push(<code key={key++} style={s.code}>{code}</code>);
    rest = rest.slice(endIdx + 3);
  }
  return parts;
}

function renderInline(text) {
  return text.split(/(`[^`]+`)/g).map((part, i) =>
    part.startsWith("`") && part.endsWith("`")
      ? <code key={i} style={{ ...s.code, display: "inline", padding: "1px 5px", margin: 0 }}>{part.slice(1, -1)}</code>
      : part
  );
}

export default function MessageBubble({ message, onRegenerate }) {
  const { role, content, id, user_rating, total_tokens, latency_ms, model_name } = message;
  const [rating, setRating] = useState(user_rating);
  const [copied, setCopied] = useState(false);

  const rate = async (val) => {
    const next = rating === val ? 0 : val;
    setRating(next);
    if (next !== 0) await messages.rate(id, next).catch(() => {});
  };

  const copy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={s.wrap(role)}>
      <div style={s.avatar(role)}>
        {role === "user" ? "U" : <i className="bi bi-stars" />}
      </div>
      <div>
        <div style={s.bubble(role)}>
          {renderContent(content)}
        </div>

        {/* Actions row */}
        {role === "assistant" && (
          <div style={s.actions}>
            <button style={s.actionBtn(copied)} onClick={copy} title="Copy">
              <i className={`bi bi-${copied ? "check2" : "clipboard"}`} />
            </button>
            <button style={s.actionBtn(rating === 1)} onClick={() => rate(1)} title="Good">
              <i className="bi bi-hand-thumbs-up" />
            </button>
            <button style={s.actionBtn(rating === -1)} onClick={() => rate(-1)} title="Bad">
              <i className="bi bi-hand-thumbs-down" />
            </button>
            {onRegenerate && (
              <button style={s.actionBtn(false)} onClick={onRegenerate} title="Regenerate">
                <i className="bi bi-arrow-clockwise" />
              </button>
            )}
          </div>
        )}

        {/* Meta */}
        {role === "assistant" && (total_tokens > 0 || model_name) && (
          <div style={s.meta}>
            {model_name && <span>{model_name}</span>}
            {total_tokens > 0 && <span> · {total_tokens} tokens</span>}
            {latency_ms  > 0 && <span> · {latency_ms}ms</span>}
          </div>
        )}
      </div>
    </div>
  );
}