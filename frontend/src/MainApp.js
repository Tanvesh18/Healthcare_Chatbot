import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, apiJson, clearToken, getToken } from "./api";
import ChatArea from "./components/ChatArea";
import Sidebar from "./components/Sidebar";

export default function MainApp() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [messages, setMessages] = useState([
    { sender: "assistant", text: "Hello! Describe your symptoms." }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [history, setHistory] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [error, setError] = useState("");
  const bufferRef = useRef("");

  const redirectToLogin = useCallback((message) => {
    clearToken();
    navigate("/login", { state: { error: message || "Please log in to continue." } });
  }, [navigate]);

  const refreshHistory = useCallback(async () => {
    if (!getToken()) return;

    try {
      setHistory(await apiJson("/api/auth/history"));
    } catch (err) {
      if (err.status === 401) {
        redirectToLogin(err.message);
      }
    }
  }, [redirectToLogin]);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  async function updateChat(chatId, nextMessages) {
    await apiJson(`/api/auth/chat/${chatId}`, {
      method: "PUT",
      body: JSON.stringify({ messages: nextMessages })
    });
  }

  async function sendMessage() {
    if (!input.trim()) return;

    if (!getToken()) {
      redirectToLogin("Please log in to start a consultation.");
      return;
    }

    const userMsg = input.trim();
    let chatId = activeChatId;
    let location = null;

    setInput("");
    setIsTyping(true);
    setError("");

    const wantsNearby = /near me|nearby|around me|doctor|hospital|clinic|medical/i.test(userMsg);

    if (wantsNearby) {
      location = await new Promise(resolve => {
        navigator.geolocation.getCurrentPosition(
          position => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
          () => resolve(null),
          { timeout: 5000 }
        );
      });

      if (!location) {
        setMessages(prev => [
          ...prev,
          {
            sender: "assistant",
            text: "To suggest nearby doctors or hospitals, I need access to your location. Please allow location permission and try again."
          }
        ]);
        setIsTyping(false);
        return;
      }
    }

    if (!chatId) {
      try {
        const { title } = await apiJson("/api/chat/title", {
          method: "POST",
          body: JSON.stringify({ text: userMsg })
        });

        const saved = await apiJson("/api/auth/save", {
          method: "POST",
          body: JSON.stringify({
            title,
            messages: [{ sender: "user", text: userMsg }]
          })
        });

        chatId = saved._id;
        setActiveChatId(chatId);
        refreshHistory();
      } catch (err) {
        setIsTyping(false);
        if (err.status === 401) {
          redirectToLogin(err.message);
          return;
        }

        setError(err.message || "Failed to start the chat.");
        return;
      }
    }

    const updatedMessages = [
      ...messages,
      { sender: "user", text: userMsg },
      { sender: "assistant", text: "" }
    ];
    setMessages(updatedMessages);

    try {
      const response = await apiFetch("/api/chat/chat-stream", {
        method: "POST",
        body: JSON.stringify({
          messages: updatedMessages.map(message => ({
            role: message.sender,
            content: message.text
          })),
          location
        })
      });

      if (!response.ok || !response.body) {
        throw new Error("Chat service is unavailable right now.");
      }

      const reader = response.body.getReader();
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
            const finalMessages = [
              ...updatedMessages.slice(0, -1),
              { sender: "assistant", text: bufferRef.current }
            ];

            setMessages(finalMessages);
            await updateChat(chatId, finalMessages);
            refreshHistory();
            setIsTyping(false);
            return;
          }

          if (token === "[ERROR]") {
            throw new Error("The assistant could not complete that response.");
          }

          bufferRef.current += token;
          setMessages(prev => {
            const nextMessages = [...prev];
            nextMessages[nextMessages.length - 1].text = bufferRef.current;
            return nextMessages;
          });
        }
      }
    } catch (err) {
      setMessages(prev => prev.filter((_, index) => index !== prev.length - 1));

      if (err.status === 401) {
        redirectToLogin(err.message);
        return;
      }

      setError(err.message || "Failed to send your message.");
    } finally {
      setIsTyping(false);
    }
  }

  function newChat() {
    setMessages([{ sender: "assistant", text: "Hello! Describe your symptoms." }]);
    setActiveChatId(null);
    setError("");
  }

  return (
    <div className={`app dark ${sidebarOpen ? "sidebar-open" : ""}`}>
      <Sidebar
        history={history}
        setHistory={setHistory}
        loadChat={chat => {
          setMessages(chat.messages);
          setActiveChatId(chat._id);
          setError("");
        }}
        newChat={newChat}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        refreshHistory={refreshHistory}
      />

      <ChatArea
        messages={messages}
        input={input}
        setInput={setInput}
        sendMessage={sendMessage}
        isTyping={isTyping}
        sidebarOpen={sidebarOpen}
        openSidebar={() => setSidebarOpen(true)}
        error={error}
      />
    </div>
  );
}
