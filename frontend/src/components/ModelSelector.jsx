// components/ModelSelector.jsx
import { useState, useEffect, useRef } from "react";
import { models } from "../services/api";

export default function ModelSelector({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [modelList, setList] = useState([]);
  const [selected, setSelected] = useState(null);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (open && 
          dropdownRef.current && 
          !dropdownRef.current.contains(event.target) &&
          buttonRef.current &&
          !buttonRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const select = (model) => {
    setSelected(model);
    onChange?.(model);
    setOpen(false);
  };

  return (
    <div className="dropdown" ref={dropdownRef}>
      <button
        ref={buttonRef}
        className="model-selector"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="model-selector-name">
          {selected?.display_name || "Select model"}
        </span>
        <svg className="model-selector-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="model-dropdown">
          <div className="model-dropdown-header">
            <div className="model-dropdown-title">Select a model</div>
          </div>
          
          <div className="model-dropdown-list">
            {modelList.length === 0 && (
              <div style={{ padding: "var(--space-6) var(--space-4)", textAlign: "center", color: "var(--color-gray-500)" }}>
                No models available
              </div>
            )}
            
            {modelList.map(m => {
              const isSelected = m.id === selected?.id;
              const isDefault = m.is_default;
              
              return (
                <div
                  key={m.id}
                  className={`model-dropdown-item ${isSelected ? "selected" : ""}`}
                  onClick={() => select(m)}
                >
                  <div className="model-dropdown-item-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                  </div>
                  <div className="model-dropdown-item-body">
                    <div className="model-dropdown-item-name">
                      {m.display_name || m.name}
                      {isDefault && (
                        <span className="model-dropdown-item-badge">Default</span>
                      )}
                    </div>
                    <div className="model-dropdown-item-desc">
                      {m.model_type || "Chat model"} · ctx {m.context_length?.toLocaleString() || "32k"}
                    </div>
                  </div>
                  {isSelected && (
                    <svg className="model-dropdown-item-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
          
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