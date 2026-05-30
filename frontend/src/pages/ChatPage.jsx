// pages/ChatPage.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { chat, conversations } from "../services/api";
import MessageBubble from "../components/MessageBubble";
import ChatInput from "../components/ChatInput";
import ModelSelector from "../components/ModelSelector";

const s = {
  page: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  topbar: {
    height: "52px", display: "flex", alignItems: "center",
    justifyContent: "space-between",
    padding: "0 20px", borderBottom: "1px solid var(--border)",
    background: "var(--surface)", flexShrink: 0,
  },
  title: { fontSize: "14px", fontWeight: 600, color: "var(--text)" },
  topRight: { display: "flex", gap: "8px", alignItems: "center" },
  iconBtn: {
    background: "none", border: "1px solid var(--border)",
    borderRadius: "8px", padding: "5px 10px",
    color: "var(--text-muted)", cursor: "pointer", fontSize: "13px",
    display: "flex", alignItems: "center", gap: "5px",
    transition: "all .15s",
  },
  messages: {
    flex: 1, overflowY: "auto", padding: "24px 20px",
    display: "flex", flexDirection: "column",
  },
  empty: {
    flex: 1, display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    color: "var(--text-muted)", textAlign: "center",
    gap: "12px",
  },
  emptyIcon: {
    fontSize: "48px",
    background: "linear-gradient(135deg, var(--accent), #a78bfa)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
  },
  emptyTitle: { fontSize: "20px", fontWeight: 700, color: "var(--text)" },
  emptyHint:  { fontSize: "13px", color: "var(--text-muted)", maxWidth: "320px" },
  suggestions: {
    display: "flex", flexWrap: "wrap", gap: "8px",
    justifyContent: "center", marginTop: "8px",
  },
  suggChip: {
    padding: "8px 14px", background: "var(--surface2)",
    border: "1px solid var(--border)", borderRadius: "20px",
    cursor: "pointer", fontSize: "12px", color: "var(--text-muted)",
    transition: "all .15s",
  },
  typing: {
    display: "flex", gap: "4px", padding: "12px 16px",
    background: "var(--surface2)", borderRadius: "18px",
    width: "fit-content", marginBottom: "20px",
    border: "1px solid var(--border)",
  },
  dot: (delay) => ({
    width: "6px", height: "6px", borderRadius: "50%",
    background: "var(--accent)",
    animation: "bounce 1.2s infinite",
    animationDelay: delay,
  }),
};

const SUGGESTIONS = [
  "Explain quantum entanglement simply",
  "Write a Python web scraper",
  "Help me debug my code",
  "Summarize my document",
];

export default function ChatPage({ newChat }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [msgs, setMsgs]         = useState([]);
  const [streaming, setStream]  = useState(false);
  const [streamText, setStreamT]= useState("");
  const [convTitle, setTitle]   = useState("New Chat");
  const [selectedModel, setModel] = useState(null);
  const [convId, setConvId]     = useState(id || null);
  const bottomRef = useRef(null);

  // Load existing conversation
  useEffect(() => {
    if (id) {
      setConvId(id);
      conversations.messages(id).then(data => {
        setMsgs(Array.isArray(data) ? data : data.results || []);
      }).catch(() => {});
      conversations.get(id).then(c => setTitle(c.title)).catch(() => {});
    } else {
      setMsgs([]);
      setConvId(null);
      setTitle("New Chat");
    }
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, streamText]);

  const send = useCallback(async (text) => {
    const userMsg = {
      id: "tmp-" + Date.now(), role: "user", content: text,
      created_at: new Date().toISOString(),
    };
    setMsgs(prev => [...prev, userMsg]);
    setStream(true);
    setStreamT("");

    const history = [...msgs, userMsg].map(m => ({ role: m.role, content: m.content }));

    try {
      let fullText = "";
      let newConvId = convId;

      for await (const chunk of chat.stream({
        messages: history,
        model_id: selectedModel?.id || null,
        conversation_id: convId,
        stream: true,
      })) {
        if (chunk.conversation_id) {
          newConvId = chunk.conversation_id;
          setConvId(newConvId);
          if (!id) navigate(`/chat/${newConvId}`, { replace: true });
        }
        if (chunk.delta) {
          fullText += chunk.delta;
          setStreamT(fullText);
        }
        if (chunk.done) {
          setMsgs(prev => [...prev, {
            id: chunk.message_id || "tmp-a-" + Date.now(),
            role: "assistant", content: fullText,
            model_name: selectedModel?.display_name || null,
            created_at: new Date().toISOString(),
          }]);
          setStreamT("");
        }
        if (chunk.error) throw new Error(chunk.error);
      }
    } catch (err) {
      setMsgs(prev => [...prev, {
        id: "err-" + Date.now(), role: "assistant",
        content: `⚠️ Error: ${err.message}`,
        created_at: new Date().toISOString(),
      }]);
      setStreamT("");
    } finally {
      setStream(false);
    }
  }, [msgs, convId, id, navigate, selectedModel]);

  const regenLast = async () => {
    const lastAssistant = [...msgs].reverse().find(m => m.role === "assistant");
    if (!lastAssistant) return;
    try {
      const updated = await chat.regenerate({
        message_id: lastAssistant.id,
        temperature: 0.7,
      });
      setMsgs(prev => prev.map(m => m.id === lastAssistant.id ? updated : m));
    } catch {}
  };

  return (
    <div style={s.page}>
      {/* Topbar */}
      <div style={s.topbar}>
        <div style={s.title}>{convTitle}</div>
        <div style={s.topRight}>
          <ModelSelector value={selectedModel?.id} onChange={setModel} />
          {convId && (
            <button style={s.iconBtn} onClick={() => conversations.share(convId, true)}>
              <i className="bi bi-share" /> Share
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div style={s.messages}>
        {msgs.length === 0 && !streaming && (
          <div style={s.empty}>
            <div style={s.emptyIcon}><i className="bi bi-stars" /></div>
            <div style={s.emptyTitle}>What can I help with?</div>
            <div style={s.emptyHint}>Ask me anything — from coding to creativity, analysis to conversation.</div>
            <div style={s.suggestions}>
              {SUGGESTIONS.map(s => (
                <button key={s} style={s.suggChip} onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {msgs.map((m, i) => (
          <MessageBubble
            key={m.id}
            message={m}
            onRegenerate={i === msgs.length - 1 && m.role === "assistant" ? regenLast : null}
          />
        ))}

        {/* Streaming indicator */}
        {streaming && streamText === "" && (
          <div style={s.typing}>
            <div style={s.dot("0s")} />
            <div style={s.dot(".2s")} />
            <div style={s.dot(".4s")} />
          </div>
        )}
        {streamText && (
          <MessageBubble
            message={{ id: "stream", role: "assistant", content: streamText, created_at: new Date().toISOString() }}
          />
        )}
        <div ref={bottomRef} />
      </div>

      <ChatInput onSend={send} disabled={streaming} />

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}