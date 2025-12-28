import React, { useState, useEffect, useRef } from "react";
import ChatArea from "./components/ChatArea";
import Sidebar from "./components/Sidebar";

export default function MainApp() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [messages, setMessages] = useState([
    { sender: "assistant", text: "Hello! Describe your symptoms." }
  ]);

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [history, setHistory] = useState([]);

  const bufferRef = useRef("");
  const displayedTextRef = useRef("");

  useEffect(() => {
    const saved = localStorage.getItem("chat-history");
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("chat-history", JSON.stringify(history));
  }, [history]);

  function normalizeMarkdown(text) {
    return text
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  async function sendMessage() {
    if (!input.trim()) return;

    const conversation = [
      ...messages.map(m => ({
        role: m.sender,
        content: m.text
      })),
      { role: "user", content: input }
    ];

    setMessages(prev => [
      ...prev,
      { sender: "user", text: input },
      { sender: "assistant", text: "" }
    ]);

    setInput("");
    setIsTyping(true);
    bufferRef.current = "";
    displayedTextRef.current = "";

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No authentication token found");
        setIsTyping(false);
        return;
      }

      const response = await fetch("http://localhost:5000/api/chat/chat-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token
        },
        body: JSON.stringify({ messages: conversation }),
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        
        if (!done) {
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;

            const token = line.replace("data: ", "");
            if (token === "[DONE]" || token === "[ERROR]") {
              // Flush remaining buffer before ending
              if (bufferRef.current.length > 0) {
                displayedTextRef.current += bufferRef.current;
                bufferRef.current = "";
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1].text =
                    normalizeMarkdown(displayedTextRef.current);
                  return updated;
                });
              }
              setIsTyping(false);
              return;
            }

            bufferRef.current += token;

            if (bufferRef.current.length >= 40) {
              displayedTextRef.current += bufferRef.current;
              bufferRef.current = "";

              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1].text =
                  normalizeMarkdown(displayedTextRef.current);
                return updated;
              });
            }
          }
        } else {
          // Stream ended - flush remaining buffer
          if (bufferRef.current.length > 0) {
            displayedTextRef.current += bufferRef.current;
            bufferRef.current = "";
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1].text =
                normalizeMarkdown(displayedTextRef.current);
              return updated;
            });
          }
          setIsTyping(false);
          break;
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => {
        const updated = [...prev];
        if (updated.length > 0 && updated[updated.length - 1].sender === "assistant") {
          updated[updated.length - 1].text = "Sorry, I couldn't process that request. Please try again.";
        } else {
          updated.push({
            sender: "assistant",
            text: "Sorry, I couldn't process that request. Please try again."
          });
        }
        return updated;
      });
      setIsTyping(false);
    }
  }

  function newChat() {
    setMessages([
      { sender: "assistant", text: "Hello! Describe your symptoms." }
    ]);
  }

  return (
    <div className="app dark sidebar-open">
      <Sidebar
        history={history}
        loadChat={(chat) => setMessages(chat.messages)}
        newChat={newChat}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      <ChatArea
        messages={messages}
        input={input}
        setInput={setInput}
        sendMessage={sendMessage}
        isTyping={isTyping}
        sidebarOpen={sidebarOpen}
        openSidebar={() => setSidebarOpen(true)}
      />
    </div>
  );
}
