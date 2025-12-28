import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { FiVolume2, FiCopy } from "react-icons/fi";

export default function ChatArea({ 
  messages, 
  input, 
  setInput, 
  sendMessage, 
  isTyping, 
  openSidebar, 
  sidebarOpen 
}) {
  const bottomRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const [speakingIndex, setSpeakingIndex] = useState(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
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

  const copyText = async (text) => {
    if (!text || !text.trim()) return;
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="chat-area">
      <div className="chat-header">
        {!sidebarOpen && <button onClick={openSidebar}>☰</button>}
      </div>

      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`msg ${msg.sender}`}>
            <div className="bubble">
              <ReactMarkdown>{msg.text}</ReactMarkdown>

              {msg.sender === "assistant" && msg.text?.trim() && (
                <div className="message-actions">
                  <button onClick={() => toggleSpeak(msg.text, i)}>
                    {speakingIndex === i ? "⏹" : <FiVolume2 />}
                  </button>
                  <button onClick={() => copyText(msg.text)}>
                    <FiCopy />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="msg assistant">
            <div className="typing"><span/><span/><span/></div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="input-box">
        <input
          placeholder="Type your symptoms..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
        />
        <button onClick={sendMessage} disabled={isTyping || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}
