import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, apiJson, clearToken, getToken } from "./api";
import ChatArea from "./components/ChatArea";
import Sidebar from "./components/Sidebar";

const SIDEBAR_WIDTH_KEY = "techfiesta.sidebarWidth";
const DEFAULT_SIDEBAR_WIDTH = 298;
const MIN_SIDEBAR_WIDTH = 260;
const MAX_SIDEBAR_WIDTH = 420;
const LOCATION_UNAVAILABLE_MESSAGE =
  "To suggest nearby doctors or hospitals, I need access to your location. Please allow location permission and try again.";

function isNearbyRequest(text) {
  return /near me|nearby|around me|doctor|hospital|clinic|medical|emergency/i.test(text);
}

function isLocationConsent(text, messages) {
  const lastAssistantMessage = [...messages].reverse().find(message => message.sender === "assistant");
  const assistantAskedForLocation =
    /access your location|allow location|location permission|nearby hospitals/i.test(lastAssistantMessage?.text || "");
  const userConsented = /^(yes|yeah|yep|sure|ok|okay|allow|please do|go ahead|find|show)\b/i.test(text.trim());

  return assistantAskedForLocation && userConsented;
}

function requestBrowserLocation() {
  if (!navigator.geolocation) {
    return Promise.resolve(null);
  }

  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      position => resolve({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy
      }),
      () => resolve(null),
      { timeout: 8000, enableHighAccuracy: true }
    );
  });
}

export default function MainApp() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const stored = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY));
    return Number.isFinite(stored) && stored >= MIN_SIDEBAR_WIDTH && stored <= MAX_SIDEBAR_WIDTH
      ? stored
      : DEFAULT_SIDEBAR_WIDTH;
  });
  const [messages, setMessages] = useState([
    { sender: "assistant", text: "Hello! Describe your symptoms." }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [history, setHistory] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [error, setError] = useState("");
  const bufferRef = useRef("");
  const activeStreamControllerRef = useRef(null);
  const chatSessionRef = useRef(0);

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

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
  }, [sidebarWidth]);

  async function updateChat(chatId, nextMessages) {
    await apiJson(`/api/auth/chat/${chatId}`, {
      method: "PUT",
      body: JSON.stringify({ messages: nextMessages })
    });
  }

  async function sendMessage(messageOverride = null) {
    const messageText = typeof messageOverride === "string" ? messageOverride : input;
    if (!messageText.trim()) return;

    if (!getToken()) {
      redirectToLogin("Please log in to start a consultation.");
      return;
    }

    const userMsg = messageText.trim();
    let chatId = activeChatId;
    let location = null;
    const chatSession = chatSessionRef.current;

    setInput("");
    setIsTyping(true);
    setError("");

    const wantsNearby = isNearbyRequest(userMsg) || isLocationConsent(userMsg, messages);

    if (wantsNearby) {
      location = await requestBrowserLocation();

      if (!location) {
        if (chatSession !== chatSessionRef.current) return;

        setMessages(prev => [
          ...prev,
          { sender: "user", text: userMsg },
          {
            sender: "assistant",
            text: LOCATION_UNAVAILABLE_MESSAGE
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
        if (chatSession !== chatSessionRef.current) return;

        setActiveChatId(chatId);
        refreshHistory();
      } catch (err) {
        if (chatSession !== chatSessionRef.current) return;

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

    activeStreamControllerRef.current?.abort();
    const streamController = new AbortController();
    activeStreamControllerRef.current = streamController;

    try {
      const response = await apiFetch("/api/chat/chat-stream", {
        method: "POST",
        signal: streamController.signal,
        body: JSON.stringify({
          messages: updatedMessages
            .filter(message => message.text?.trim())
            .map(message => ({
              role: message.sender,
              content: message.text
            })),
          location
        })
      });

      if (chatSession !== chatSessionRef.current) return;

      if (!response.ok || !response.body) {
        throw new Error("Chat service is unavailable right now.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      bufferRef.current = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (chatSession !== chatSessionRef.current) return;

        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;

          const token = line.replace("data: ", "");

          if (token === "[DONE]") {
            if (chatSession !== chatSessionRef.current) return;

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
            if (chatSession !== chatSessionRef.current) return prev;

            const nextMessages = [...prev];
            nextMessages[nextMessages.length - 1].text = bufferRef.current;
            return nextMessages;
          });
        }
      }
    } catch (err) {
      if (err.name === "AbortError" || chatSession !== chatSessionRef.current) {
        return;
      }

      setMessages(prev => prev.filter((_, index) => index !== prev.length - 1));

      if (err.status === 401) {
        redirectToLogin(err.message);
        return;
      }

      setError(err.message || "Failed to send your message.");
    } finally {
      if (activeStreamControllerRef.current === streamController) {
        activeStreamControllerRef.current = null;
      }

      if (chatSession === chatSessionRef.current) {
        setIsTyping(false);
      }
    }
  }

  function newChat() {
    chatSessionRef.current += 1;
    activeStreamControllerRef.current?.abort();
    activeStreamControllerRef.current = null;
    bufferRef.current = "";
    setMessages([{ sender: "assistant", text: "Hello! Describe your symptoms." }]);
    setActiveChatId(null);
    setInput("");
    setIsTyping(false);
    setError("");
  }

  return (
    <div
      className={`app dark ${sidebarOpen ? "sidebar-open" : ""}`}
      style={{ "--sidebar-width": `${sidebarWidth}px` }}
    >
      <Sidebar
        history={history}
        setHistory={setHistory}
        loadChat={chat => {
          chatSessionRef.current += 1;
          activeStreamControllerRef.current?.abort();
          activeStreamControllerRef.current = null;
          bufferRef.current = "";
          setMessages(chat.messages);
          setActiveChatId(chat._id);
          setInput("");
          setIsTyping(false);
          setError("");
        }}
        newChat={newChat}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        refreshHistory={refreshHistory}
        sidebarWidth={sidebarWidth}
        setSidebarWidth={setSidebarWidth}
        minSidebarWidth={MIN_SIDEBAR_WIDTH}
        maxSidebarWidth={MAX_SIDEBAR_WIDTH}
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
