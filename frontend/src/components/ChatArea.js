import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import SymptomAssessment from "./SymptomAssessment";
import { 
  FiVolume2, 
  FiCopy, 
  FiSend, 
  FiCheck,
  FiUser,
  FiMenu
} from "react-icons/fi";

export default function ChatArea({ 
  messages, 
  input, 
  setInput, 
  sendMessage, 
  isTyping, 
  openSidebar, 
  sidebarOpen,
  error
}) {
  const bottomRef = useRef(null);
  const messagesRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [showAssessment, setShowAssessment] = useState(false);

  useEffect(() => {
    if (!messagesRef.current) return;

    messagesRef.current.scrollTo({
      top: messagesRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [messages, isTyping]);

  const toggleSpeak = (text, index) => {
    if (!text || !text.trim()) return;

    if (speakingIndex === index) {
      synthRef.current.cancel();
      setSpeakingIndex(null);
      return;
    }

    synthRef.current.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.onend = () => setSpeakingIndex(null);
    setSpeakingIndex(index);
    synthRef.current.speak(u);
  };

  const copyText = async (text, index) => {
    if (!text || !text.trim()) return;
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handlePromptClick = (promptText) => {
    setInput(promptText);
  };

  // Determine if showing welcome screen (initial state)
  const isInitialState = messages.length <= 1;

  return (
    <div className="chat-area">
      {/* Top Header Navbar */}
      <header className="chat-header">
        <div className="header-left">
          {!sidebarOpen && (
            <button className="open-sidebar-btn" onClick={openSidebar} title="Open Sidebar">
              <FiMenu />
            </button>
          )}
          <div className="header-title">
            <span>CuraLink AI</span>
            <div className="ai-badge">
              <span className="ai-pulse-dot"></span>
              <span>Llama 3.3 AI Active</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content: Hero or Messages */}
      {isInitialState ? (
        <div className="hero-container">
          <div className="hero-icon-wrapper">
            <div className="hero-glow"></div>
            <div className="hero-icon">🏥</div>
          </div>

          <h1 className="hero-title">How can CuraLink AI help you today?</h1>
          <p className="hero-subtitle">
            Get instant, AI-guided symptom analysis, medical guidance, and real-time locations of nearby doctors and hospitals.
          </p>

          <div className="hero-prompts-grid">
            <button
              type="button"
              className="prompt-card"
              onClick={() => setShowAssessment(true)}
            >
              <div className="prompt-icon">🩺</div>
              <div className="prompt-text">Symptom Checker</div>
              <div className="prompt-subtext">Share symptoms through a guided assessment</div>
            </button>

            <div 
              className="prompt-card"
              onClick={() => handlePromptClick("Find nearby hospitals and emergency clinics near me")}
            >
              <div className="prompt-icon">📍</div>
              <div className="prompt-text">Find Nearby Doctors</div>
              <div className="prompt-subtext">Locate clinics within 3km radius</div>
            </div>

            <div 
              className="prompt-card"
              onClick={() => handlePromptClick("What is a recommended diet and lifestyle for heart health?")}
            >
              <div className="prompt-icon">🍎</div>
              <div className="prompt-text">Wellness & Diet Tips</div>
              <div className="prompt-subtext">Personalized lifestyle recommendations</div>
            </div>

            <div 
              className="prompt-card"
              onClick={() => handlePromptClick("Explain the first-aid steps for a minor burn")}
            >
              <div className="prompt-icon">⚡</div>
              <div className="prompt-text">First Aid Guide</div>
              <div className="prompt-subtext">Quick steps for minor injuries</div>
            </div>
          </div>
        </div>
      ) : (
        <div ref={messagesRef} className="messages">
          {error && (
            <div className="error-banner" style={{ width: "100%", maxWidth: "48rem" }}>
              {error}
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`msg ${msg.sender}`}>
              <div className="msg-avatar">
                {msg.sender === "user" ? <FiUser /> : "🩺"}
              </div>

              <div className="bubble">
                <ReactMarkdown>{msg.text}</ReactMarkdown>

                {msg.sender === "assistant" && msg.text?.trim() && (
                  <div className="message-actions">
                    <button 
                      className="message-action-btn"
                      onClick={() => toggleSpeak(msg.text, i)}
                      title="Read Aloud"
                    >
                      <FiVolume2 />
                      <span>{speakingIndex === i ? "Stop" : "Listen"}</span>
                    </button>

                    <button 
                      className="message-action-btn"
                      onClick={() => copyText(msg.text, i)}
                      title="Copy Response"
                    >
                      {copiedIndex === i ? <FiCheck style={{ color: "#10b981" }} /> : <FiCopy />}
                      <span>{copiedIndex === i ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="msg assistant">
              <div className="msg-avatar">🩺</div>
              <div className="typing-box">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}

      {/* Floating Input Dock */}
      <div className="input-container-wrapper">
        <div className="input-box">
          <input
            placeholder="Describe your symptoms or ask a health question..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <button 
            className="send-btn"
            onClick={sendMessage} 
            disabled={isTyping || !input.trim()}
            title="Send message"
          >
            <FiSend />
          </button>
        </div>
      </div>

      {showAssessment && (
        <SymptomAssessment
          onClose={() => setShowAssessment(false)}
          onSubmit={assessmentMessage => {
            setShowAssessment(false);
            sendMessage(assessmentMessage);
          }}
        />
      )}
    </div>
  );
}
