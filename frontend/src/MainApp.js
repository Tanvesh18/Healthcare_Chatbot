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
  const [activeChatId, setActiveChatId] = useState(null);

  const bufferRef = useRef("");

  async function refreshHistory() {
    const token = localStorage.getItem("token");
    if (!token) return;

    const res = await fetch("http://localhost:5000/api/auth/history", {
      headers: { Authorization: token }
    });

    setHistory(await res.json());
  }

  useEffect(() => {
    refreshHistory();
  }, []);

  async function updateChat(chatId, msgs) {
    const token = localStorage.getItem("token");
    await fetch(`http://localhost:5000/api/auth/chat/${chatId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: token
      },
      body: JSON.stringify({ messages: msgs })
    });
  }

  async function sendMessage() {
    if (!input.trim()) return;

    const userMsg = input.trim();
    setInput("");
    setIsTyping(true);

    const token = localStorage.getItem("token");
    let chatId = activeChatId;

    const wantsNearby = /near me|nearby|around me|doctor|hospital|clinic|medical/i.test(userMsg);

    let location = null;

    if (wantsNearby) {
      location = await new Promise(resolve => {
        navigator.geolocation.getCurrentPosition(
          pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(null),
          { timeout: 5000 }
        );
      });

      if (!location) {
        setMessages(prev => [
          ...prev,
          { sender: "assistant", text: "To suggest nearby doctors or hospitals, I need access to your location. Please allow location permission and try again." }
        ]);
        setIsTyping(false);
        return;
      }
    }

    if (!chatId) {
      const titleRes = await fetch("http://localhost:5000/api/chat/title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: userMsg })
      });

      const { title } = await titleRes.json();

      const saveRes = await fetch("http://localhost:5000/api/auth/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token
        },
        body: JSON.stringify({ title, messages: [{ sender: "user", text: userMsg }] })
      });

      const saved = await saveRes.json();
      chatId = saved._id;
      setActiveChatId(chatId);
      refreshHistory();
    }

    const updated = [...messages, { sender: "user", text: userMsg }, { sender: "assistant", text: "" }];
    setMessages(updated);

    const res = await fetch("http://localhost:5000/api/chat/chat-stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token
      },
      body: JSON.stringify({
        messages: updated.map(m => ({ role: m.sender, content: m.text })),
        location
      })
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    bufferRef.current = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const token = line.replace("data: ", "");

        if (token === "[DONE]") {
          const finalMsgs = [...updated.slice(0, -1), { sender: "assistant", text: bufferRef.current }];
          setMessages(finalMsgs);
          await updateChat(chatId, finalMsgs);
          refreshHistory();
          setIsTyping(false);
          return;
        }

        bufferRef.current += token;
        setMessages(prev => {
          const arr = [...prev];
          arr[arr.length - 1].text = bufferRef.current;
          return arr;
        });
      }
    }
  }

  function newChat() {
    setMessages([{ sender: "assistant", text: "Hello! Describe your symptoms." }]);
    setActiveChatId(null);
  }

  return (
    <div className="app dark sidebar-open">
      <Sidebar
        history={history}
        setHistory={setHistory}
        loadChat={chat => {
          setMessages(chat.messages);
          setActiveChatId(chat._id);
        }}
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
