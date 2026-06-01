// pages/ChatPage.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { chat, conversations } from "../services/api";
import MessageBubble  from "../components/MessageBubble";
import ChatInput      from "../components/ChatInput";
import ModelSelector  from "../components/ModelSelector";

const SUGGESTIONS = [
  { icon: "✉️", title: "Write an email",    desc: "Drafts, replies, professional or casual" },
  { icon: "🧠", title: "Explain a concept", desc: "Clear explanations of complex topics"    },
  { icon: "💻", title: "Help with code",    desc: "Debug, review, or write new code"        },
  { icon: "🗺️", title: "Plan a trip",       desc: "Itineraries, recommendations, tips"     },
];

export default function ChatPage({ onOpenSidebar }) {
  const { id }       = useParams();
  const navigate     = useNavigate();

  const [msgs, setMsgs]           = useState([]);
  const [streaming, setStream]    = useState(false);
  const [streamText, setStreamT]  = useState("");
  const [selectedModel, setModel] = useState(null);
  const [convId, setConvId]       = useState(id || null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const messagesEndRef       = useRef(null);
  const messagesContainerRef = useRef(null);

  /* ── Load existing conversation ── */
  useEffect(() => {
    if (id) {
      setConvId(id);
      conversations.messages(id)
        .then((data) => setMsgs(Array.isArray(data) ? data : data.results || []))
        .catch(() => {});
    } else {
      setMsgs([]);
      setConvId(null);
    }
  }, [id]);

  /* ── Auto-scroll ── */
  useEffect(() => { scrollToBottom(); }, [msgs, streamText]);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setShowScrollBtn(!nearBottom);
  };

  /* ── Send ── */
  const send = useCallback(
    async (text) => {
      const userMsg = {
        id: "tmp-" + Date.now(),
        role: "user",
        content: text,
        created_at: new Date().toISOString(),
      };
      setMsgs((prev) => [...prev, userMsg]);
      setStream(true);
      setStreamT("");

      const history = [...msgs, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        let fullText  = "";
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
            setMsgs((prev) => [
              ...prev,
              {
                id: chunk.message_id || "tmp-a-" + Date.now(),
                role: "assistant",
                content: fullText,
                model_name: selectedModel?.display_name || null,
                total_tokens: chunk.total_tokens || 0,
                latency_ms: chunk.latency_ms || 0,
                created_at: new Date().toISOString(),
              },
            ]);
            setStreamT("");
          }
          if (chunk.error) throw new Error(chunk.error);
        }
      } catch (err) {
        setMsgs((prev) => [
          ...prev,
          {
            id: "err-" + Date.now(),
            role: "assistant",
            content: `⚠️ Error: ${err.message}`,
            created_at: new Date().toISOString(),
          },
        ]);
        setStreamT("");
      } finally {
        setStream(false);
      }
    },
    [msgs, convId, id, navigate, selectedModel]
  );

  const stopGeneration = useCallback(() => {
    setStream(false);
    setStreamT("");
  }, []);

  const regenLast = async () => {
    const last = [...msgs].reverse().find((m) => m.role === "assistant");
    if (!last) return;
    try {
      const updated = await chat.regenerate({ message_id: last.id, temperature: 0.7 });
      setMsgs((prev) => prev.map((m) => (m.id === last.id ? updated : m)));
    } catch {}
  };

  const handleNewChat = () => {
    setMsgs([]);
    setConvId(null);
    setStreamT("");
    setStream(false);
    navigate("/");
  };

  const handleShare = async () => {
    if (!convId) return;
    try {
      await conversations.share(convId, true);
      alert("Conversation shared!");
    } catch {
      alert("Failed to share conversation.");
    }
  };

  const isEmpty = msgs.length === 0 && !streaming;

  return (
    <>
      {/* ══ HEADER ══ */}
      <header className="header">
        <div className="header-left">
          {/* Hamburger — mobile only */}
          <button
            className="icon-btn"
            onClick={onOpenSidebar}
            title="Open menu"
            aria-label="Open sidebar"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>

          {/* Model selector */}
          <div style={{ position: "relative" }}>
            <ModelSelector value={selectedModel?.id} onChange={setModel} />
          </div>
        </div>

        <div className="header-right">
          {convId && (
            <button className="header-action" onClick={handleShare}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5"  r="3" />
                <circle cx="6"  cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59"  y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51"  x2="8.59"  y2="10.49" />
              </svg>
              <span>Share</span>
            </button>
          )}

          <button className="icon-btn" onClick={handleNewChat} title="New chat" aria-label="New chat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </header>

      {/* ══ CHAT BODY ══ */}
      <div
        className="chat-body"
        ref={messagesContainerRef}
        onScroll={handleScroll}
      >
        <div className="chat-inner">

          {/* ── Welcome / empty state ── */}
          {isEmpty && (
            <div className="welcome">
              <div className="welcome-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <h1 className="welcome-title">What can I help with?</h1>
              <p className="welcome-sub">
                Ask anything — write, code, analyze, create, or just chat.
              </p>
              <div className="suggestion-grid">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.title}
                    className="suggestion-card"
                    onClick={() => send(s.desc)}
                  >
                    <div className="sug-icon">{s.icon}</div>
                    <div>
                      <div className="sug-title">{s.title}</div>
                      <div className="sug-desc">{s.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Messages ── */}
          {msgs.map((m, i) => (
            <MessageBubble
              key={m.id}
              message={m}
              onRegenerate={
                i === msgs.length - 1 && m.role === "assistant"
                  ? regenLast
                  : null
              }
            />
          ))}

          {/* ── Streaming bubble ── */}
          {streaming && streamText && (
            <MessageBubble
              message={{
                id: "stream",
                role: "assistant",
                content: streamText,
                created_at: new Date().toISOString(),
              }}
              isStreaming
            />
          )}

          {/* ── Typing indicator (before first token) ── */}
          {streaming && !streamText && (
            <div className="typing-row">
              <div className="msg-avatar ai">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <div className="typing-dots">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Scroll-to-bottom button ── */}
        <button
          className={`scroll-btn${showScrollBtn ? "" : " hidden"}`}
          onClick={scrollToBottom}
          aria-label="Scroll to bottom"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </button>
      </div>

      {/* ══ INPUT ══ */}
      <ChatInput
        onSend={send}
        disabled={streaming}
        isStreaming={streaming}
        onStop={stopGeneration}
      />
    </>
  );
}