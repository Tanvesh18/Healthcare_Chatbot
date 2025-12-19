import React, { useState, useEffect, useRef } from "react";

import ChatArea from "./components/ChatArea";
import Sidebar from "./components/Sidebar";

import "./App.css";

export default function App() {
  const [theme, setTheme] = useState("dark");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [messages, setMessages] = useState([
    { sender: "assistant", text: "Hello! Describe your symptoms." }
  ]);

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [history, setHistory] = useState([]);

  /* ✅ refs for streaming (eslint-safe) */
  const bufferRef = useRef("");
  const displayedTextRef = useRef("");

  /* -----------------------------------------
     LOAD & SAVE HISTORY
  ------------------------------------------ */
  useEffect(() => {
    const saved = localStorage.getItem("chat-history");
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("chat-history", JSON.stringify(history));
  }, [history]);

  /* -----------------------------------------
     MARKDOWN NORMALIZATION
  ------------------------------------------ */
  function normalizeMarkdown(text) {
    return text
      .replace(/\*\*\s*(.+?)\s*:\s*\*\*/g, "**$1:**")
      .replace(/\*\*(.+?:)\*\*\s*(\S)/g, "**$1**\n\n$2")
      .replace(/(\b)(over|under)\s*\n\s*(the)\s*\n\s*(counter)/gi, "$1$2 $3 $4")
      .replace(/\n-\s*/g, "\n- ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  /* -----------------------------------------
     SAVE CURRENT CHAT
  ------------------------------------------ */
  function saveCurrentChat() {
    if (messages.length <= 1) return;

    const firstUserMsg = messages.find(m => m.sender === "user");

    setHistory(prev => [
      {
        title: firstUserMsg ? firstUserMsg.text.slice(0, 30) : "New Chat",
        messages,
        pinned: false,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        })
      },
      ...prev
    ]);
  }

  /* -----------------------------------------
     SIDEBAR ACTIONS
  ------------------------------------------ */
  function deleteChat(index) {
    setHistory(prev => prev.filter((_, i) => i !== index));
  }

  function renameChat(index) {
    const newTitle = prompt("Rename chat:");
    if (!newTitle) return;

    setHistory(prev =>
      prev.map((chat, i) =>
        i === index ? { ...chat, title: newTitle } : chat
      )
    );
  }

  function togglePin(index) {
    setHistory(prev => {
      const updated = [...prev];
      updated[index].pinned = !updated[index].pinned;
      return updated.sort((a, b) => (b.pinned === true) - (a.pinned === true));
    });
  }

  /* -----------------------------------------
     STREAMING SEND MESSAGE (FIXED)
  ------------------------------------------ */
  async function sendMessage() {
    if (!input.trim()) return;

    const userText = input;

    const conversation = [
      ...messages.map(m => ({
        role: m.sender,
        content: m.text
      })),
      { role: "user", content: userText }
    ];

    setMessages(prev => [...prev, { sender: "user", text: userText }]);
    setInput("");
    setIsTyping(true);

    setMessages(prev => {
      if (prev.at(-1)?.sender === "assistant" && prev.at(-1)?.text === "") {
        return prev;
      }
      return [...prev, { sender: "assistant", text: "" }];
    });

    bufferRef.current = "";
    displayedTextRef.current = "";

    try {
      const response = await fetch("http://localhost:3000/chat-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: conversation })
      });

      if (!response.body) throw new Error("No stream");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          const token = line.replace("data: ", "");

          if (token === "[DONE]") {
            displayedTextRef.current += bufferRef.current;
            bufferRef.current = "";

            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1].text =
                normalizeMarkdown(displayedTextRef.current);
              return updated;
            });

            setIsTyping(false);
            return;
          }

          bufferRef.current += token;

          if (
            bufferRef.current.length >= 40 ||
            /[.!?\n]$/.test(bufferRef.current)
          ) {
            displayedTextRef.current += bufferRef.current;
            bufferRef.current = "";

            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1].text =
                normalizeMarkdown(displayedTextRef.current);
              return updated;
            });

            await new Promise(r => setTimeout(r, 120));
          }
        }
      }
    } catch (error) {
      console.error("Streaming error:", error);
      setMessages(prev => [
        ...prev,
        { sender: "assistant", text: "⚠️ Error generating response." }
      ]);
      setIsTyping(false);
    }
  }

  /* -----------------------------------------
     NEW CHAT
  ------------------------------------------ */
  function newChat() {
    saveCurrentChat();
    bufferRef.current = "";
    displayedTextRef.current = "";
    setMessages([{ sender: "assistant", text: "Hello! Describe your symptoms." }]);
  }

  return (
    <div className={`app ${theme}`}>
      <Sidebar
        history={history}
        loadChat={(chat) => setMessages(chat.messages)}
        newChat={newChat}
        deleteChat={deleteChat}
        renameChat={renameChat}
        togglePin={togglePin}
        theme={theme}
        setTheme={setTheme}
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
