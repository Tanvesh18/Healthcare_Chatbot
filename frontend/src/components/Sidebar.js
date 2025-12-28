import React, { useEffect, useState } from "react";
import {
  FiPlus,
  FiSearch,
  FiMessageSquare,
  FiChevronLeft,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import HealthProfile from "./HealthProfile";

export default function Sidebar({
  history,
  loadChat,
  newChat,
  isOpen,
  setIsOpen,
  refreshHistory
}) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("http://localhost:5000/api/auth/me", {
      headers: { Authorization: token }
    })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("token");
        navigate("/login");
      });
  }, [navigate]);

  // Remove the old useEffect that was conflicting

  async function deleteChat(id, e) {
    e.stopPropagation(); // Prevent triggering loadChat when clicking delete
    
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      await fetch(`http://localhost:5000/api/auth/chat/${id}`, {
        method: "DELETE",
        headers: { Authorization: token }
      });

      // Refresh history after deletion
      if (refreshHistory) {
        refreshHistory();
      }
    } catch (err) {
      console.error("Failed to delete chat:", err);
    }
  }

  return (
    <aside className={`sidebar ${!isOpen ? "closed" : ""}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">TechFiesta AI</div>
        <button className="sidebar-close" onClick={() => setIsOpen(false)}>
          <FiChevronLeft />
        </button>
      </div>

      <nav className="sidebar-section">
        <div className="sidebar-item" onClick={newChat}>
          <FiPlus /><span>New chat</span>
        </div>
        <div className="sidebar-item">
          <FiSearch /><span>Search chats</span>
        </div>
      </nav>

      <div className="sidebar-section sidebar-history">
        <div className="sidebar-label">Your chats</div>
        {history.length === 0 ? (
          <div className="sidebar-label" style={{ padding: "1rem", opacity: 0.5, textAlign: "center" }}>
            No chats yet. Start a new conversation!
          </div>
        ) : (
          history.map(chat => {
            if (!chat || !chat._id) {
              console.warn("Invalid chat in history:", chat);
              return null;
            }
            
            return (
              <div 
                key={chat._id} 
                className="sidebar-item" 
                style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}
                onClick={(e) => {
                  // Only load if not clicking the delete button
                  if (!e.target.closest('.chat-delete')) {
                    console.log("Loading chat from sidebar:", chat);
                    if (loadChat) {
                      loadChat(chat);
                    }
                  }
                }}
              >
                <div 
                  className="truncate" 
                  style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.5rem" }}
                >
                  <FiMessageSquare /> 
                  <span className="truncate">{chat.title || "New Chat"}</span>
                </div>
                <button 
                  className="chat-delete" 
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChat(chat._id, e);
                  }}
                  style={{ flexShrink: 0 }}
                >
                  ❌
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="sidebar-footer">
        {user ? (
          <>
            <div className="sidebar-user">👤 {user.name}</div>

            <button className="auth-btn profile" onClick={() => setShowProfile(true)}>
              Health Profile
            </button>

            <button className="auth-btn logout" onClick={() => {
              localStorage.removeItem("token");
              navigate("/login");
            }}>
              Logout
            </button>
          </>
        ) : (
          <>
            <div className="sidebar-user">👤 Guest</div>
            <div className="sidebar-auth-buttons">
              <button className="auth-btn login" onClick={() => navigate("/login")}>Login</button>
              <button className="auth-btn signup" onClick={() => navigate("/signup")}>Sign up</button>
            </div>
          </>
        )}
      </div>

      {showProfile && <HealthProfile user={user} onClose={() => setShowProfile(false)} />}
    </aside>
  );
}
