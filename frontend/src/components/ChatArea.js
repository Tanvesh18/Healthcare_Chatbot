import React, { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

export default function ChatArea({
  messages,
  input,
  setInput,
  sendMessage,
  isTyping,
  openSidebar,
  sidebarOpen     // ✅ ADD THIS
}) {
  const bottomRef = useRef(null);

  // ✅ Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  return (
    <div className="chat-area">

      {/* Chat Header */}
      <div className="chat-header">
        {!sidebarOpen && (
          <button
            className="open-sidebar-btn"
            onClick={openSidebar}
            title="Open sidebar"
          >
            ☰
          </button>
        )}
      </div>

      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`msg ${msg.sender}`}>
            <div className="bubble">
              <ReactMarkdown
                components={{
                  p: (props) => <p style={{ marginBottom: 10 }} {...props} />,
                  li: (props) => <li style={{ marginBottom: 6 }} {...props} />,
                  strong: (props) => <strong style={{ fontWeight: 600 }} {...props} />,
                  h1: (props) => (
                    <h1 style={{ fontSize: "1.05rem", margin: "10px 0" }} {...props} />
                  ),
                  h2: (props) => (
                    <h2 style={{ fontSize: "1rem", margin: "10px 0" }} {...props} />
                  )
                }}
              >
                {msg.text}
              </ReactMarkdown>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="msg assistant">
            <div className="typing">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="input-box">
        <input
          type="text"
          placeholder="Type your symptoms..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage}>Send</button>
      </div>

    </div>
  );
}
