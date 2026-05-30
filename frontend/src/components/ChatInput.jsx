// components/ChatInput.jsx
import { useState, useRef, useCallback } from "react";

const s = {
  container: {
    padding: "16px 20px 20px",
    borderTop: "1px solid var(--border)",
    background: "var(--surface)",
  },
  inner: {
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    borderRadius: "14px",
    display: "flex",
    alignItems: "flex-end",
    gap: "8px",
    padding: "10px 12px",
    transition: "border-color .2s",
  },
  innerFocused: {
    borderColor: "var(--accent)",
    boxShadow: "0 0 0 3px var(--accent-glow)",
  },
  textarea: {
    flex: 1, background: "none", border: "none", outline: "none",
    color: "var(--text)", fontSize: "14px", fontFamily: "'Syne', sans-serif",
    lineHeight: "1.5", resize: "none", maxHeight: "160px",
    overflowY: "auto", minHeight: "22px",
  },
  sendBtn: (disabled) => ({
    width: "36px", height: "36px", borderRadius: "10px",
    background: disabled ? "var(--surface)" : "var(--accent)",
    border: "none", cursor: disabled ? "default" : "pointer",
    color: disabled ? "var(--text-muted)" : "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "16px", flexShrink: 0, transition: "all .15s",
  }),
  attachBtn: {
    background: "none", border: "none", cursor: "pointer",
    color: "var(--text-muted)", fontSize: "16px",
    display: "flex", alignItems: "center",
    padding: "4px", borderRadius: "6px",
  },
  hint: {
    fontSize: "11px", color: "var(--text-muted)",
    textAlign: "center", marginTop: "8px",
  },
};

export default function ChatInput({ onSend, disabled, onAttach }) {
  const [value, setValue]   = useState("");
  const [focused, setFocus] = useState(false);
  const ref = useRef(null);

  const submit = useCallback(() => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
    if (ref.current) { ref.current.style.height = "auto"; }
  }, [value, disabled, onSend]);

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const autoResize = (e) => {
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
    setValue(e.target.value);
  };

  return (
    <div style={s.container}>
      <div style={{ ...s.inner, ...(focused ? s.innerFocused : {}) }}>
        {onAttach && (
          <button style={s.attachBtn} onClick={onAttach} title="Attach file" type="button">
            <i className="bi bi-paperclip" />
          </button>
        )}
        <textarea
          ref={ref}
          value={value}
          onChange={autoResize}
          onKeyDown={onKey}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          placeholder={disabled ? "Waiting for response…" : "Message NeuralChat…"}
          disabled={disabled}
          rows={1}
          style={s.textarea}
        />
        <button
          style={s.sendBtn(!value.trim() || disabled)}
          onClick={submit}
          disabled={!value.trim() || disabled}
          type="button"
        >
          {disabled
            ? <i className="bi bi-hourglass-split" />
            : <i className="bi bi-arrow-up" />
          }
        </button>
      </div>
      <div style={s.hint}>Enter to send · Shift+Enter for newline</div>
    </div>
  );
}