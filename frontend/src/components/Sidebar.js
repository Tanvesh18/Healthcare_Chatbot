import React, { useEffect, useState } from "react";
import {
  FiPlus,
  FiSearch,
  FiMessageSquare,
  FiChevronLeft,
  FiTrash2,
  FiActivity,
  FiLogOut,
  FiLogIn,
  FiUserPlus
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import HealthProfile from "./HealthProfile";

export default function Sidebar({
  history,
  setHistory,
  loadChat,
  newChat,
  isOpen,
  setIsOpen,
  refreshHistory
}) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

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

  async function deleteChat(id, e) {
    e.stopPropagation();
  
    const token = localStorage.getItem("token");
    if (!token) return;
  
    // Optimistic UI removal
    setHistory(prev => prev.filter(chat => chat._id !== id));
  
    try {
      await fetch(`http://localhost:5000/api/auth/chat/${id}`, {
        method: "DELETE",
        headers: { Authorization: token }
      });
    } catch (err) {
      console.error("Delete failed, restoring chat", err);
      if (refreshHistory) refreshHistory();
    }
  }  

  const filteredHistory = history.filter(chat => 
    !searchQuery.trim() || 
    (chat.title && chat.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <aside className={`sidebar ${!isOpen ? "closed" : ""}`}>
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="brand-icon">🏥</div>
          <div className="sidebar-logo">TechFiesta AI</div>
        </div>
        <button className="sidebar-close" onClick={() => setIsOpen(false)} title="Close Sidebar">
          <FiChevronLeft />
        </button>
      </div>

      {/* Primary Actions */}
      <nav className="sidebar-section">
        <div className="sidebar-item new-chat-btn" onClick={newChat}>
          <FiPlus />
          <span>New Consultation</span>
        </div>

        <div className="sidebar-item" onClick={() => setShowSearch(!showSearch)}>
          <FiSearch />
          <span>Search Chats</span>
        </div>

        {showSearch && (
          <div style={{ padding: "0.25rem 0.5rem 0.5rem" }}>
            <input
              type="text"
              placeholder="Filter history..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "0.45rem 0.75rem",
                borderRadius: "8px",
                border: "1px solid var(--border-glass)",
                background: "rgba(0, 0, 0, 0.3)",
                color: "var(--text-main)",
                fontSize: "0.82rem",
                outline: "none"
              }}
            />
          </div>
        )}
      </nav>

      {/* Consultation History List */}
      <div className="sidebar-section sidebar-history">
        <div className="sidebar-label">Recent Consultations</div>
        
        {filteredHistory.length === 0 ? (
          <div className="sidebar-label" style={{ padding: "1rem 0.6rem", opacity: 0.5, textAlign: "center", textTransform: "none" }}>
            {history.length === 0 ? "No chats yet. Start a new consultation!" : "No matching chats found."}
          </div>
        ) : (
          filteredHistory.map(chat => {
            if (!chat || !chat._id) return null;
            
            return (
              <div 
                key={chat._id} 
                className="sidebar-item"
                onClick={(e) => {
                  if (!e.target.closest('.chat-delete')) {
                    if (loadChat) loadChat(chat);
                  }
                }}
              >
                <FiMessageSquare style={{ color: "var(--primary-cyan)" }} /> 
                <span className="truncate" style={{ flex: 1 }}>{chat.title || "New Chat"}</span>
                <button 
                  className="chat-delete" 
                  onClick={(e) => deleteChat(chat._id, e)}
                  title="Delete Chat"
                >
                  <FiTrash2 />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* User Card & Auth Footer */}
      <div className="sidebar-footer">
        {user ? (
          <>
            <div className="sidebar-user-card">
              <div className="user-avatar">
                {user.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="user-info">
                <span className="user-name">{user.name}</span>
                <span className="user-status">
                  <span className="status-dot"></span> Profile Active
                </span>
              </div>
            </div>

            <button className="auth-btn profile" onClick={() => setShowProfile(true)}>
              <FiActivity style={{ marginRight: 6 }} /> Health Profile
            </button>

            <button className="auth-btn logout" onClick={() => {
              localStorage.removeItem("token");
              navigate("/login");
            }}>
              <FiLogOut style={{ marginRight: 6 }} /> Logout
            </button>
          </>
        ) : (
          <>
            <div className="sidebar-user-card">
              <div className="user-avatar" style={{ background: "var(--text-dim)" }}>G</div>
              <div className="user-info">
                <span className="user-name">Guest User</span>
                <span className="user-status" style={{ color: "var(--text-dim)" }}>
                  Login to save history
                </span>
              </div>
            </div>

            <div className="sidebar-auth-buttons">
              <button className="auth-btn login" onClick={() => navigate("/login")}>
                <FiLogIn style={{ marginRight: 4 }} /> Login
              </button>
              <button className="auth-btn" onClick={() => navigate("/signup")}>
                <FiUserPlus style={{ marginRight: 4 }} /> Sign up
              </button>
            </div>
          </>
        )}
      </div>

      {showProfile && <HealthProfile user={user || {}} onClose={() => setShowProfile(false)} />}
    </aside>
  );
}
