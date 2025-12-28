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
  setIsOpen
}) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showProfile, setShowProfile] = useState(false);

  // Load user
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("http://localhost:5000/api/auth/me", {
      headers: { Authorization: token }
    })
      .then(res => {
        if (!res.ok) throw new Error("Auth failed");
        return res.json();
      })
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("token");
        navigate("/login");
      });
  }, [navigate]);

  // Load saved chats
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !loadChat) return;

    fetch("http://localhost:5000/api/chat/history", {
      headers: { Authorization: token }
    })
      .then(res => res.json())
      .then(loadChat);
  }, [loadChat]);

  return (
    <aside className={`sidebar ${!isOpen ? "closed" : ""}`}>
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">TechFiesta AI</div>
        <button className="sidebar-close" onClick={() => setIsOpen(false)}>
          <FiChevronLeft />
        </button>
      </div>

      {/* Actions */}
      <nav className="sidebar-section">
        <div className="sidebar-item" onClick={newChat}>
          <FiPlus /><span>New chat</span>
        </div>
        <div className="sidebar-item">
          <FiSearch /><span>Search chats</span>
        </div>
      </nav>

      {/* History */}
      <div className="sidebar-section sidebar-history">
        <div className="sidebar-label">Your chats</div>
        {history.map((chat, i) => (
          <div key={i} className="sidebar-item" onClick={() => loadChat(chat)}>
            <FiMessageSquare />
            <span className="truncate">{chat.title}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        {user ? (
          <>
            <div className="sidebar-user">👤 {user.name}</div>

            <button className="auth-btn profile" onClick={() => setShowProfile(true)}>
              Health Profile
            </button>

            <button
              className="auth-btn logout"
              onClick={() => {
                localStorage.removeItem("token");
                navigate("/login");
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <div className="sidebar-user">👤 Guest</div>
            <div className="sidebar-auth-buttons">
              <button className="auth-btn login" onClick={() => navigate("/login")}>
                Login
              </button>
              <button className="auth-btn signup" onClick={() => navigate("/signup")}>
                Sign up
              </button>
            </div>
          </>
        )}
      </div>

      {showProfile && <HealthProfile user={user} onClose={() => setShowProfile(false)} />}
    </aside>
  );
}
