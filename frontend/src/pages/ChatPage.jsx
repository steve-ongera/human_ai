// pages/ChatPage.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { chat, conversations } from "../services/api";
import MessageBubble from "../components/MessageBubble";
import ChatInput from "../components/ChatInput";
import ModelSelector from "../components/ModelSelector";

const SUGGESTIONS = [
  { title: "Quantum Physics", desc: "Explain quantum entanglement simply" },
  { title: "Web Scraper", desc: "Write a Python web scraper" },
  { title: "Debug Help", desc: "Help me debug my code" },
  { title: "Document Summary", desc: "Summarize my document" },
];

export default function ChatPage({ newChat }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [msgs, setMsgs] = useState([]);
  const [streaming, setStream] = useState(false);
  const [streamText, setStreamT] = useState("");
  const [convTitle, setTitle] = useState("New Chat");
  const [selectedModel, setModel] = useState(null);
  const [convId, setConvId] = useState(id || null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

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

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [msgs, streamText]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Handle scroll button visibility
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    }
  };

  const send = useCallback(async (text) => {
    const userMsg = {
      id: "tmp-" + Date.now(),
      role: "user",
      content: text,
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
            role: "assistant",
            content: fullText,
            model_name: selectedModel?.display_name || null,
            total_tokens: chunk.total_tokens || 0,
            latency_ms: chunk.latency_ms || 0,
            created_at: new Date().toISOString(),
          }]);
          setStreamT("");
        }
        if (chunk.error) throw new Error(chunk.error);
      }
    } catch (err) {
      setMsgs(prev => [...prev, {
        id: "err-" + Date.now(),
        role: "assistant",
        content: `⚠️ Error: ${err.message}`,
        created_at: new Date().toISOString(),
      }]);
      setStreamT("");
    } finally {
      setStream(false);
    }
  }, [msgs, convId, id, navigate, selectedModel]);

  const stopGeneration = useCallback(() => {
    setStream(false);
    setStreamT("");
  }, []);

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

  const handleNewChat = () => {
    setMsgs([]);
    setConvId(null);
    setTitle("New Chat");
    setStreamT("");
    setStream(false);
    navigate("/");
  };

  const handleShare = async () => {
    if (convId) {
      try {
        await conversations.share(convId, true);
        alert("Conversation shared successfully!");
      } catch {
        alert("Failed to share conversation");
      }
    }
  };

  return (
    <div className="main-content">
      <div className="content-area">
        {/* Top Header */}
        <div className="top-header">
          <div className="header-left">
            <button className="btn-sidebar-toggle" onClick={() => window.dispatchEvent(new CustomEvent('toggle-sidebar'))}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="model-selector-wrapper">
              <ModelSelector value={selectedModel?.id} onChange={setModel} />
            </div>
          </div>
          <div className="header-right">
            {convId && (
              <button className="btn-share" onClick={handleShare}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                Share
              </button>
            )}
            <button className="btn-header-action" onClick={handleNewChat} title="New chat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div 
          className="chat-messages-wrap" 
          ref={messagesContainerRef}
          onScroll={handleScroll}
        >
          <div className="chat-messages-inner">
            {msgs.length === 0 && !streaming && (
              <div className="welcome-screen">
                <div className="welcome-logo">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <h1 className="welcome-heading">What can I help with?</h1>
                <p className="welcome-subheading">
                  Ask me anything — from coding to creativity, analysis to conversation.
                </p>

                {/* Capabilities */}
                <div className="capability-row">
                  <div className="capability-pill">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4M12 8h.01" />
                    </svg>
                    Knowledgeable
                  </div>
                  <div className="capability-pill">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                    Code interpreter
                  </div>
                  <div className="capability-pill">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                    Conversational
                  </div>
                </div>

                {/* Suggestions */}
                <div className="suggestion-grid">
                  {SUGGESTIONS.map(s => (
                    <button key={s.title} className="suggestion-card" onClick={() => send(s.desc)}>
                      <div className="suggestion-card-icon">✨</div>
                      <div className="suggestion-card-body">
                        <div className="suggestion-card-title">{s.title}</div>
                        <div className="suggestion-card-desc">{s.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {msgs.map((m, i) => (
              <MessageBubble
                key={m.id}
                message={m}
                onRegenerate={i === msgs.length - 1 && m.role === "assistant" ? regenLast : null}
              />
            ))}

            {/* Streaming message */}
            {streaming && streamText && (
              <MessageBubble
                message={{ 
                  id: "stream", 
                  role: "assistant", 
                  content: streamText,
                  created_at: new Date().toISOString()
                }}
                isStreaming={true}
              />
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Scroll to bottom button */}
          {showScrollButton && (
            <button className="scroll-to-bottom" onClick={scrollToBottom}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          )}
        </div>

        {/* Chat Input */}
        <ChatInput 
          onSend={send} 
          disabled={streaming} 
          isStreaming={streaming}
          onStop={stopGeneration}
        />
      </div>
    </div>
  );
}