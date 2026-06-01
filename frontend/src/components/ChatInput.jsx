// components/ChatInput.jsx
import { useState, useRef, useCallback } from "react";

export default function ChatInput({ onSend, disabled, onAttach, isStreaming, onStop }) {
  const [value, setValue]   = useState("");
  const [files, setFiles]   = useState([]);   // { name, file }[]
  const fileInputRef        = useRef(null);
  const textareaRef         = useRef(null);

  /* ── Submit ── */
  const submit = useCallback(() => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
    setFiles([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [value, disabled, onSend]);

  /* ── Keyboard: Enter sends, Shift+Enter newline ── */
  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  /* ── Auto-resize textarea ── */
  const autoResize = (e) => {
    setValue(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 192) + "px";
  };

  /* ── File attach ── */
  const triggerFile = () => fileInputRef.current?.click();

  const handleFiles = (e) => {
    const added = Array.from(e.target.files).map((f) => ({ name: f.name, file: f }));
    setFiles((prev) => [...prev, ...added]);
    e.target.value = "";
  };

  const removeFile = (name) => setFiles((prev) => prev.filter((f) => f.name !== name));

  const hasValue = value.trim().length > 0;

  return (
    /* Mirrors .input-area in the design system */
    <div className="input-area">
      <div className="input-inner">
        <div className="input-box">

          {/* ── Attachment chips ── */}
          {files.length > 0 && (
            <div className="attachment-row">
              {files.map(({ name }) => (
                <div className="att-chip" key={name}>
                  <span className="att-chip-name">{name}</span>
                  <button
                    className="att-chip-rm"
                    onClick={() => removeFile(name)}
                    aria-label={`Remove ${name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── Textarea row ── */}
          <div className="textarea-row">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              onChange={handleFiles}
              aria-hidden="true"
            />

            {/* Attach button */}
            <button
              className="input-btn"
              onClick={onAttach ?? triggerFile}
              title="Attach file"
              type="button"
              disabled={disabled}
              aria-label="Attach file"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
              </svg>
            </button>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              className="chat-textarea"
              value={value}
              onChange={autoResize}
              onKeyDown={onKey}
              placeholder={disabled ? "Waiting for response…" : "Message humanAI"}
              disabled={disabled}
              rows={1}
              aria-label="Message input"
            />

            {/* Stop / Send */}
            {isStreaming ? (
              <button
                className="stop-btn"
                onClick={onStop}
                title="Stop generating"
                type="button"
                aria-label="Stop generating"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
              </button>
            ) : (
              <button
                className="send-btn"
                onClick={submit}
                disabled={!hasValue || disabled}
                type="button"
                aria-label="Send message"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            )}
          </div>

          {/* ── Toolbar ── */}
          <div className="toolbar-row">
            <div className="toolbar-left">
              <button className="toolbar-btn" title="Search the web" type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <span>Search</span>
              </button>

              <button className="toolbar-btn" title="Reason step by step" type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
                <span>Reason</span>
              </button>

              <button className="toolbar-btn" title="Voice input" type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                  <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
                </svg>
                <span>Voice</span>
              </button>
            </div>

            <div className="toolbar-right">
              <button className="toolbar-btn" title="More options" type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="19" cy="12" r="1" />
                  <circle cx="5"  cy="12" r="1" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* ── Disclaimer ── */}
        <div className="disclaimer">
          humanAI can make mistakes. Consider checking important information.{" "}
          <a href="#" target="_blank" rel="noopener noreferrer">Learn more</a>
        </div>
      </div>
    </div>
  );
}