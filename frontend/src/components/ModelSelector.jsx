// components/ModelSelector.jsx
import { useState, useEffect } from "react";
import { models } from "../services/api";

const s = {
  wrap: { position: "relative", display: "inline-block" },
  btn: {
    display: "flex", alignItems: "center", gap: "6px",
    background: "var(--surface2)", border: "1px solid var(--border)",
    borderRadius: "8px", padding: "5px 10px", cursor: "pointer",
    color: "var(--text-muted)", fontSize: "12px",
    transition: "all .15s",
  },
  dropdown: {
    position: "absolute", top: "calc(100% + 4px)", left: 0,
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: "10px", minWidth: "200px",
    boxShadow: "0 8px 32px #0006", zIndex: 50, overflow: "hidden",
  },
  item: (active) => ({
    display: "flex", flexDirection: "column",
    padding: "10px 14px", cursor: "pointer",
    background: active ? "var(--surface2)" : "transparent",
    transition: "background .1s", border: "none", width: "100%", textAlign: "left",
  }),
  itemName: { fontSize: "13px", color: "var(--text)", fontWeight: active => active ? 600 : 400 },
  itemType: { fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" },
};

export default function ModelSelector({ value, onChange }) {
  const [open, setOpen]       = useState(false);
  const [modelList, setList]  = useState([]);
  const [selected, setSelected] = useState(null);

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

  const select = (model) => {
    setSelected(model);
    onChange?.(model);
    setOpen(false);
  };

  return (
    <div style={s.wrap}>
      <button style={s.btn} onClick={() => setOpen(o => !o)}>
        <i className="bi bi-cpu" />
        <span>{selected?.display_name || "Select model"}</span>
        <i className={`bi bi-chevron-${open ? "up" : "down"}`} style={{ fontSize: 10 }} />
      </button>

      {open && (
        <div style={s.dropdown}>
          {modelList.length === 0 && (
            <div style={{ padding: "12px 14px", color: "var(--text-muted)", fontSize: "13px" }}>
              No models configured
            </div>
          )}
          {modelList.map(m => (
            <button
              key={m.id}
              style={s.item(m.id === selected?.id)}
              onClick={() => select(m)}
            >
              <span style={{ ...s.itemName, fontWeight: m.id === selected?.id ? 600 : 400 }}>
                {m.display_name}
                {m.is_default && (
                  <span style={{ marginLeft: 6, fontSize: 10, color: "var(--accent)" }}>default</span>
                )}
              </span>
              <span style={s.itemType}>{m.model_type} · ctx {m.context_length?.toLocaleString()}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}