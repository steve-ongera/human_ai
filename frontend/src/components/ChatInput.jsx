// components/ChatInput.jsx
import { useState, useRef, useCallback } from "react";

export default function ChatInput({ onSend, disabled, onAttach, isStreaming, onStop }) {
  const [value, setValue] = useState("");
  const [focused, setFocus] = useState(false);
  const textareaRef = useRef(null);

  const submit = useCallback(() => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, disabled, onSend]);

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const autoResize = (e) => {
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
    setValue(e.target.value);
  };

  const handleAttach = () => {
    if (onAttach) onAttach();
  };

  const hasValue = value.trim().length > 0;

  return (
    <div className="chat-input-wrapper">
      <div className="chat-input-inner">
        <div className={`chat-input-box ${focused ? "focused" : ""}`}>
          {/* Attachments preview area (optional) */}
          <div className="chat-attachments-row" style={{ display: "none" }}>
            {/* Would show file attachments here */}
          </div>

          {/* Textarea row */}
          <div className="chat-textarea-row">
            {onAttach && (
              <button
                className="chat-input-btn"
                onClick={handleAttach}
                title="Attach file"
                type="button"
                disabled={disabled}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
              </button>
            )}

            <textarea
              ref={textareaRef}
              value={value}
              onChange={autoResize}
              onKeyDown={onKey}
              onFocus={() => setFocus(true)}
              onBlur={() => setFocus(false)}
              placeholder={disabled ? "Waiting for response..." : "Message humanAI..."}
              disabled={disabled}
              rows={1}
              className="chat-textarea"
            />

            {isStreaming ? (
              <button
                className="chat-stop-btn"
                onClick={onStop}
                title="Stop generating"
                type="button"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
              </button>
            ) : (
              <button
                className="chat-send-btn"
                onClick={submit}
                disabled={!hasValue || disabled}
                type="button"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                </svg>
              </button>
            )}
          </div>

          {/* Toolbar row */}
          <div className="chat-toolbar-row">
            <div className="chat-toolbar-left">
              <button className="chat-input-btn" title="Model" disabled={disabled}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </button>
              <button className="chat-input-btn" title="Attach" onClick={handleAttach} disabled={disabled}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
              </button>
            </div>
            <div className="chat-toolbar-right">
              <button className="chat-input-btn" title="Temperature" disabled={disabled}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="chat-disclaimer">
          humanAI may produce inaccurate information.{" "}
          <a href="#" target="_blank" rel="noopener noreferrer">Learn more</a>
        </div>
      </div>
    </div>
  );
}