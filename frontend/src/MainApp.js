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
  const displayedTextRef = useRef("");

  // Debounce timer for refreshHistory
  const refreshTimerRef = useRef(null);

  // Function to refresh history from database
  const refreshHistory = async () => {
    // Clear any pending refresh
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    // Debounce the refresh to prevent multiple rapid calls
    refreshTimerRef.current = setTimeout(async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("No token found for refreshHistory");
        return;
      }

      try {
        const res = await fetch("http://localhost:5000/api/auth/history", {
          headers: { Authorization: token }
        });
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        console.log("History loaded:", data.length, "chats");
        setHistory(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to refresh history:", err);
        setHistory([]);
      }
    }, 300); // Wait 300ms before refreshing
  };

  useEffect(() => {
    // Only load history once on mount
    const token = localStorage.getItem("token");
    if (token) {
      refreshHistory();
    }
  }, []); // Empty dependency array - only run once

  function normalizeMarkdown(text) {
    return text.replace(/\n{3,}/g, "\n\n").trim();
  }

  async function updateChatDB(title, msgs) {
    const token = localStorage.getItem("token");
    const chatId = activeChatId;
    if (!chatId) return;

    try {
      await fetch(`http://localhost:5000/api/auth/chat/${chatId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token
        },
        body: JSON.stringify({ 
          title: title || undefined, // Only update title if provided
          messages: msgs 
        })
      });
    } catch (err) {
      console.error("Failed to update chat:", err);
    }
  }

  async function sendMessage() {
    if (!input.trim()) return;

    const userMessage = input.trim();
    const updated = [...messages, { sender: "user", text: userMessage }];
    setMessages([...updated, { sender: "assistant", text: "" }]);
    setInput("");
    setIsTyping(true);

    const token = localStorage.getItem("token");
    if (!token) {
      setIsTyping(false);
      return;
    }

    // Create new chat if this is the first message
    let chatId = activeChatId;
    if (!chatId) {
      try {
        console.log("Creating new chat with message:", userMessage);
        
        // Generate title from first message
        let title = "Health Consultation";
        try {
          const titleRes = await fetch("http://localhost:5000/api/chat/title", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: userMessage })
          });
          
          if (titleRes.ok) {
            const titleData = await titleRes.json();
            title = titleData.title || title;
            console.log("Generated title:", title);
          } else {
            console.warn("Title generation failed, using fallback");
          }
        } catch (titleErr) {
          console.error("Title generation error:", titleErr);
          // Use fallback title
          const words = userMessage.split(/\s+/).slice(0, 3);
          title = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") + " Consultation";
        }

        // Create new chat with initial user message
        const saveRes = await fetch("http://localhost:5000/api/auth/save", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token
          },
          body: JSON.stringify({ 
            title, 
            messages: [{ sender: "user", text: userMessage }]
          })
        });

        if (!saveRes.ok) {
          throw new Error(`Failed to save chat: ${saveRes.status}`);
        }

        const savedChat = await saveRes.json();
        console.log("Chat saved:", savedChat);
        chatId = savedChat._id;
        setActiveChatId(chatId);
        await refreshHistory();
      } catch (err) {
        console.error("Failed to create chat:", err);
        setIsTyping(false);
        setMessages(prev => {
          const arr = [...prev];
          arr[arr.length - 1].text = "Failed to create chat. Please try again.";
          return arr;
        });
        return;
      }
    }

    // Check if user is asking about nearby doctors/hospitals
    let location = null;
    const locationKeywords = /nearby|near me|around me|hospital|clinic|doctor|physician|medical center|healthcare facility/i;
    if (locationKeywords.test(userMessage)) {
      try {
        console.log("Location request detected, getting user location...");
        location = await new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error("Geolocation not supported"));
            return;
          }
          
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                lat: position.coords.latitude,
                lng: position.coords.longitude
              });
            },
            (error) => {
              console.warn("Location access denied or failed:", error);
              resolve(null); // Don't fail, just continue without location
            },
            { timeout: 5000, enableHighAccuracy: false }
          );
        });
        
        if (location) {
          console.log("Location obtained:", location);
        }
      } catch (err) {
        console.warn("Failed to get location:", err);
        location = null;
      }
    }

    try {
      const response = await fetch("http://localhost:5000/api/chat/chat-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token
        },
        body: JSON.stringify({
          messages: updated
            .filter(m => m.text && m.text.trim()) // Filter out empty messages
            .map(m => ({ 
              role: m.sender === "user" ? "user" : "assistant", 
              content: m.text 
            })),
          location: location // Send location if available
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      bufferRef.current = "";
      displayedTextRef.current = "";

      while (true) {
        const { value, done } = await reader.read();
        
        if (!done) {
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const token = line.replace("data: ", "");

            if (token === "[DONE]" || token === "[ERROR]") {
              // Flush remaining buffer
              if (bufferRef.current.length > 0) {
                displayedTextRef.current += bufferRef.current;
                bufferRef.current = "";
              }

              const finalMessages = [
                ...updated,
                { sender: "assistant", text: normalizeMarkdown(displayedTextRef.current) }
              ];

              setMessages(finalMessages);
              
              // Update chat in database
              if (chatId) {
                await updateChatDB(null, finalMessages); // Keep existing title
                refreshHistory();
              }
              
              setIsTyping(false);
              return;
            }

            bufferRef.current += token;

            if (bufferRef.current.length >= 40) {
              displayedTextRef.current += bufferRef.current;
              bufferRef.current = "";

              setMessages(prev => {
                const arr = [...prev];
                arr[arr.length - 1].text = normalizeMarkdown(displayedTextRef.current);
                return arr;
              });
            }
          }
        } else {
          // Stream ended - flush remaining buffer
          if (bufferRef.current.length > 0) {
            displayedTextRef.current += bufferRef.current;
            bufferRef.current = "";
          }

          const finalMessages = [
            ...updated,
            { sender: "assistant", text: normalizeMarkdown(displayedTextRef.current) }
          ];

          setMessages(finalMessages);
          
          // Update chat in database
          if (chatId) {
            await updateChatDB(null, finalMessages);
            refreshHistory();
          }
          
          setIsTyping(false);
          break;
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => {
        const arr = [...prev];
        if (arr.length > 0 && arr[arr.length - 1].sender === "assistant") {
          arr[arr.length - 1].text = "Sorry, something went wrong. Please try again.";
        } else {
          arr.push({ sender: "assistant", text: "Sorry, something went wrong. Please try again." });
        }
        return arr;
      });
      setIsTyping(false);
    }
  }

  function newChat() {
    console.log("New chat clicked");
    setMessages([{ sender: "assistant", text: "Hello! Describe your symptoms." }]);
    setActiveChatId(null);
    setInput("");
    setIsTyping(false);
    bufferRef.current = "";
    displayedTextRef.current = "";
    // Refresh history to show any new chats
    refreshHistory();
  }

  return (
    <div className="app dark sidebar-open">
      <Sidebar
        history={history}
        loadChat={chat => {
          console.log("Loading chat:", chat);
          if (!chat) {
            console.warn("No chat provided to loadChat");
            return;
          }
          
          // Ensure we have a valid chat ID
          if (!chat._id) {
            console.error("Chat missing _id:", chat);
            return;
          }
          
          if (chat.messages && Array.isArray(chat.messages) && chat.messages.length > 0) {
            // Filter out any empty messages and ensure proper format
            const validMessages = chat.messages.filter(m => m && m.text && m.text.trim());
            console.log("Valid messages found:", validMessages.length);
            
            if (validMessages.length > 0) {
              setMessages(validMessages);
              setActiveChatId(chat._id);
              console.log("Chat loaded successfully with", validMessages.length, "messages");
            } else {
              console.warn("No valid messages, starting fresh");
              setMessages([{ sender: "assistant", text: "Hello! Describe your symptoms." }]);
              setActiveChatId(chat._id);
            }
          } else {
            console.warn("Chat has no messages array, starting fresh");
            // If chat has no messages, start fresh but keep the chat ID
            setMessages([{ sender: "assistant", text: "Hello! Describe your symptoms." }]);
            setActiveChatId(chat._id);
          }
          setInput("");
          setIsTyping(false);
          bufferRef.current = "";
          displayedTextRef.current = "";
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
      />
    </div>
  );
}
