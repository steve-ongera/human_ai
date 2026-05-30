// components/MessageBubble.jsx
import { useState } from "react";
import { messages } from "../services/api";

// Helper to render markdown-like content with code blocks
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
    const language = newline === -1 ? "" : block.slice(0, newline).trim();
    const code = newline === -1 ? block : block.slice(newline + 1);
    
    parts.push(
      <div key={key++} className="code-block">
        <div className="code-block-header">
          <span className="code-block-lang">{language || "code"}</span>
          <button className="code-block-copy" data-code={code}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
            </svg>
            Copy
          </button>
        </div>
        <pre><code>{code}</code></pre>
      </div>
    );
    rest = rest.slice(endIdx + 3);
  }
  return parts;
}

function renderInline(text) {
  // Split by inline code blocks
  const parts = [];
  let current = text;
  let idx = 0;
  
  while (current) {
    const codeStart = current.indexOf("`");
    if (codeStart === -1) {
      parts.push(current);
      break;
    }
    if (codeStart > 0) {
      parts.push(current.slice(0, codeStart));
    }
    const codeEnd = current.indexOf("`", codeStart + 1);
    if (codeEnd === -1) {
      parts.push(current.slice(codeStart));
      break;
    }
    const code = current.slice(codeStart + 1, codeEnd);
    parts.push(
      <code key={`code-${idx++}`} className="inline-code">
        {code}
      </code>
    );
    current = current.slice(codeEnd + 1);
  }
  
  // Convert newlines to <br> tags
  return parts.map((part, i) => {
    if (typeof part === "string") {
      return part.split("\n").map((line, j) => (
        <span key={`line-${i}-${j}`}>
          {line}
          {j < part.split("\n").length - 1 && <br />}
        </span>
      ));
    }
    return part;
  });
}

export default function MessageBubble({ message, onRegenerate, isStreaming = false }) {
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
    <div className={`message-row message-row--${role}`}>
      <div className={`message-container message-container--${role}`}>
        {/* Avatar */}
        <div className={`message-avatar message-avatar--${role}`}>
          {role === "user" ? (
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

        {/* Message Body */}
        <div className="message-body">
          <div className="message-sender">
            {role === "user" ? "You" : "NeuralChat"}
          </div>

          {/* Message Content */}
          <div className={`message-content ${role === "user" ? "message-content--user" : ""}`}>
            {isStreaming && role === "assistant" && content === "" ? (
              <div className="typing-indicator">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            ) : (
              <>
                {renderContent(content)}
                {isStreaming && role === "assistant" && content && (
                  <span className="streaming-cursor" />
                )}
              </>
            )}
          </div>

          {/* Message Actions (only for assistant messages) */}
          {role === "assistant" && !isStreaming && (
            <div className="message-actions">
              <button
                className={`message-action-btn ${copied ? "active" : ""}`}
                onClick={copy}
                title="Copy"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                </svg>
              </button>
              <button
                className={`message-action-btn ${rating === 1 ? "active" : ""}`}
                onClick={() => rate(1)}
                title="Good response"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                </svg>
              </button>
              <button
                className={`message-action-btn ${rating === -1 ? "active" : ""}`}
                onClick={() => rate(-1)}
                title="Bad response"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 15v4a3 3 0 0 0 3 3l4-9V5h-11.3a2 2 0 0 0-2 1.7l-1.4 9a2 2 0 0 0 2 2.3zM17 5h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" />
                </svg>
              </button>
              {onRegenerate && (
                <button
                  className="message-action-btn"
                  onClick={onRegenerate}
                  title="Regenerate response"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                    <path d="M23 1l-6 6M1 23l6-6M23 23l-6-6M1 1l6 6" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Metadata / Usage Info */}
          {role === "assistant" && (total_tokens > 0 || model_name || latency_ms > 0) && (
            <div className="message-meta" style={{ 
              fontSize: "var(--font-size-xs)", 
              color: "var(--color-gray-500)", 
              marginTop: "var(--space-2)",
              display: "flex",
              gap: "var(--space-2)",
              flexWrap: "wrap"
            }}>
              {model_name && (
                <span className="badge badge-gray">{model_name}</span>
              )}
              {total_tokens > 0 && (
                <span>{total_tokens} tokens</span>
              )}
              {latency_ms > 0 && (
                <span>{latency_ms}ms</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}