// components/ModelSelector.jsx
import { useState, useEffect, useRef } from "react";
import { models } from "../services/api";

export default function ModelSelector({ value, onChange }) {
  const [open, setOpen]         = useState(false);
  const [modelList, setList]    = useState([]);
  const [selected, setSelected] = useState(null);
  const dropdownRef             = useRef(null);
  const buttonRef               = useRef(null);

  /* ── Fetch model list on mount ── */
  useEffect(() => {
    models.list().then(r => {
      const list = Array.isArray(r) ? r : r.results || [];
      setList(list);
      if (!value && list.length) {
        const def = list.find(m => m.is_default) || list[0];
        setSelected(def);
        onChange?.(def);
      } else if (value) {
        setSelected(list.find(m => m.id === value) || null);
      }
    }).catch(() => {});
  }, []);

  /* ── Close on outside click ── */
  useEffect(() => {
    const onDown = (e) => {
      if (
        open &&
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        buttonRef.current  && !buttonRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  /* ── Close on Escape ── */
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const select = (model) => {
    setSelected(model);
    onChange?.(model);
    setOpen(false);
  };

  return (
    /* .dropdown — position: relative wrapper from main.css */
    <div className="dropdown" ref={dropdownRef}>

      {/* ── Trigger button — .model-selector from main.css ── */}
      <button
        ref={buttonRef}
        className={`model-selector${open ? " open" : ""}`}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="15" height="15" style={{ flexShrink: 0, color: "var(--brand)" }}>
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>

        {/* .model-selector-name */}
        <span className="model-selector-name">
          {selected?.display_name || "Select model"}
        </span>

        {/* .model-selector-chevron — rotates when open via CSS */}
        <svg
          className="model-selector-chevron"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* ── Dropdown panel — .model-dropdown from main.css ── */}
      {open && (
        <div className="model-dropdown" role="listbox">

          {/* .model-dropdown-header */}
          <div className="model-dropdown-header">
            <div className="model-dropdown-title">Select a model</div>
          </div>

          {/* .model-dropdown-list */}
          <div className="model-dropdown-list">
            {modelList.length === 0 ? (
              <div
                style={{
                  padding: "var(--space-6) var(--space-4)",
                  textAlign: "center",
                  color: "var(--text-muted)",
                  fontSize: "var(--font-size-sm)",
                }}
              >
                No models available
              </div>
            ) : (
              modelList.map(m => {
                const isSelected = m.id === selected?.id;

                return (
                  /* .model-dropdown-item / .model-dropdown-item.selected */
                  <div
                    key={m.id}
                    className={`model-dropdown-item${isSelected ? " selected" : ""}`}
                    onClick={() => select(m)}
                    role="option"
                    aria-selected={isSelected}
                  >
                    {/* .model-dropdown-item-icon */}
                    <div className="model-dropdown-item-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                      </svg>
                    </div>

                    {/* .model-dropdown-item-body */}
                    <div className="model-dropdown-item-body">

                      {/* .model-dropdown-item-name + .model-dropdown-item-badge */}
                      <div className="model-dropdown-item-name">
                        {m.display_name || m.name}
                        {m.is_default && (
                          <span className="model-dropdown-item-badge">Default</span>
                        )}
                      </div>

                      {/* .model-dropdown-item-desc */}
                      <div className="model-dropdown-item-desc">
                        {m.model_type || "Chat model"} · ctx {m.context_length?.toLocaleString() || "32k"}
                      </div>
                    </div>

                    {/* .model-dropdown-item-check — visible only when selected */}
                    {isSelected && (
                      <svg
                        className="model-dropdown-item-check"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* .model-dropdown-footer */}
          <div className="model-dropdown-footer">
            <a href="#" className="model-dropdown-footer-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
              Learn about models
            </a>
          </div>

        </div>
      )}
    </div>
  );
}