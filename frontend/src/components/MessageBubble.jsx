// components/MessageBubble.jsx
import { useState } from "react";
import { messages } from "../services/api";

/* ─────────────────────────────────────────────
   Markdown-like renderer
   Uses .code-block / .code-block-header /
   .code-lang / .code-copy from main.css
───────────────────────────────────────────── */
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
    const block    = rest.slice(codeIdx + 3, endIdx);
    const newline  = block.indexOf("\n");
    const language = newline === -1 ? "" : block.slice(0, newline).trim();
    const code     = newline === -1 ? block : block.slice(newline + 1);

    parts.push(
      <CodeBlock key={key++} language={language} code={code} />
    );
    rest = rest.slice(endIdx + 3);
  }
  return parts;
}

/* Inline code — maps to `code:not(pre code)` styles in main.css */
function renderInline(text) {
  const parts = [];
  let current = text;
  let idx = 0;

  while (current) {
    const codeStart = current.indexOf("`");
    if (codeStart === -1) { parts.push(current); break; }
    if (codeStart > 0)    { parts.push(current.slice(0, codeStart)); }
    const codeEnd = current.indexOf("`", codeStart + 1);
    if (codeEnd === -1)   { parts.push(current.slice(codeStart)); break; }
    parts.push(<code key={`ic-${idx++}`}>{current.slice(codeStart + 1, codeEnd)}</code>);
    current = current.slice(codeEnd + 1);
  }

  return parts.map((part, i) => {
    if (typeof part !== "string") return part;
    return part.split("\n").map((line, j, arr) => (
      <span key={`ln-${i}-${j}`}>
        {line}
        {j < arr.length - 1 && <br />}
      </span>
    ));
  });
}

/* Code block with copy button — uses .code-block, .code-block-header,
   .code-lang, .code-copy from main.css                                */
function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="code-block">
      <div className="code-block-header">
        <span className="code-lang">{language || "code"}</span>
        <button className="code-copy" onClick={copy}>
          {copied ? (
            /* bi-check — Bootstrap Icons */
            <i className="bi bi-check-lg" style={{ fontSize: 13 }} />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            </svg>
          )}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre><code>{code}</code></pre>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
export default function MessageBubble({ message, onRegenerate, isStreaming = false }) {
  const { role, content, id, user_rating, total_tokens, latency_ms, model_name } = message;
  const [rating, setRating]   = useState(user_rating);
  const [copied,  setCopied]  = useState(false);

  const isUser      = role === "user";
  const isAssistant = role === "assistant";

  /* Rating — 0 means cleared */
  const rate = async (val) => {
    const next = rating === val ? 0 : val;
    setRating(next);
    if (next !== 0) await messages.rate(id, next).catch(() => {});
  };

  /* Copy full message text */
  const copy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  /* ── Layout: mirrors .msg-row / .msg-row.user in main.css ── */
  return (
    <div className={`msg-row${isUser ? " user" : ""}`}>

      {/* Avatar — .msg-avatar.ai / .msg-avatar.user */}
      <div className={`msg-avatar ${isUser ? "user" : "ai"}`}>
        {isUser ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        )}
      </div>

      {/* Body — .msg-body */}
      <div className="msg-body">

        {/* Bubble — .msg-bubble.ai / .msg-bubble.user */}
        <div className={`msg-bubble ${isUser ? "user" : "ai"}`}>
          {isStreaming && isAssistant && content === "" ? (
            /* Typing dots — .typing-dots / .typing-dot */
            <div className="typing-dots">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          ) : (
            <>
              {renderContent(content)}
              {isStreaming && isAssistant && content && (
                <span className="streaming-cursor" />
              )}
            </>
          )}
        </div>

        {/* Actions — .msg-actions / .msg-action-btn from main.css */}
        {isAssistant && !isStreaming && (
          <div className="msg-actions">

            {/* Copy */}
            <button
              className={`msg-action-btn${copied ? " liked" : ""}`}
              onClick={copy}
              title="Copy"
            >
              {copied ? (
                <i className="bi bi-check-lg" style={{ fontSize: 14 }} />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                </svg>
              )}
            </button>

            {/* Thumbs up */}
            <button
              className={`msg-action-btn${rating === 1 ? " liked" : ""}`}
              onClick={() => rate(1)}
              title="Good response"
            >
              <svg viewBox="0 0 24 24" fill={rating === 1 ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
              </svg>
            </button>

            {/* Thumbs down */}
            <button
              className={`msg-action-btn${rating === -1 ? " liked" : ""}`}
              onClick={() => rate(-1)}
              title="Bad response"
            >
              <svg viewBox="0 0 24 24" fill={rating === -1 ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V5h-11.3a2 2 0 0 0-2 1.7l-1.4 9a2 2 0 0 0 2 2.3zM17 5h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" />
              </svg>
            </button>

            {/* Regenerate */}
            {onRegenerate && (
              <button
                className="msg-action-btn"
                onClick={onRegenerate}
                title="Regenerate response"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="1 4 1 10 7 10" />
                  <polyline points="23 20 23 14 17 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Metadata — tokens / latency / model, uses .badge.badge-gray */}
        {isAssistant && (total_tokens > 0 || model_name || latency_ms > 0) && (
          <div
            className="msg-actions"
            style={{ opacity: 1, marginTop: 4, gap: 6, flexWrap: "wrap" }}
          >
            {model_name && (
              <span className="badge badge-gray">{model_name}</span>
            )}
            {total_tokens > 0 && (
              <span className="text-xs text-muted">{total_tokens} tokens</span>
            )}
            {latency_ms > 0 && (
              <span className="text-xs text-muted">{latency_ms}ms</span>
            )}
          </div>
        )}

      </div>
    </div>
  );
}