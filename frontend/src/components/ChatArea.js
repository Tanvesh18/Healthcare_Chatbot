import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { FiVolume2, FiCopy } from "react-icons/fi";

export default function ChatArea({ input, setInput, openSidebar, sidebarOpen }) {
  const bottomRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(null);

  /* 👋 Auto greeting */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("http://localhost:5000/api/auth/me", {
      headers: { Authorization: token }
    })
      .then(res => res.json())
      .then(user => {
        setMessages([{ sender: "assistant", text: `Hi ${user.name}, how are you feeling today?` }]);
      });
  }, []);

  /* Auto scroll */
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

  /* 💬 Send Message to Groq */
  const sendMessage = async () => {
    if (!input.trim()) return;

    const token = localStorage.getItem("token");
    const updated = [...messages, { sender: "user", text: input }];
    setMessages(updated);
    setInput("");
    setIsTyping(true);

    let location = null;

    if (/near me|nearby|around me|hospital|clinic|doctor|medical|physician/i.test(input)) {
      await new Promise(resolve => {
        navigator.geolocation.getCurrentPosition(pos => {
          location = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          };
          resolve();
        });
      });
    }

    try {
      const res = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token
        },
        body: JSON.stringify({
          messages: updated.map(m => ({
            role: m.sender === "user" ? "user" : "assistant",
            content: m.text
          })),
          location
        })
      });

      const data = await res.json();

      if (data.text?.trim()) {
        setMessages([...updated, { sender: "assistant", text: data.text }]);
      }

    } catch {
      setMessages([...updated, {
        sender: "assistant",
        text: "I'm sorry, I couldn't process that."
      }]);
    } finally {
      setIsTyping(false);
    }
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
          onKeyDown={e => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}
