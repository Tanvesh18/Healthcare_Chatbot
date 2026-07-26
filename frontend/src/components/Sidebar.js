import React, { useEffect, useRef, useState } from "react";
import {
  FiPlus,
  FiSearch,
  FiMessageSquare,
  FiChevronLeft,
  FiTrash2,
  FiActivity,
  FiLogOut,
  FiLogIn,
  FiUserPlus,
  FiChevronRight
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { apiJson, clearToken, getToken } from "../api";

export default function Sidebar({
  history,
  setHistory,
  loadChat,
  newChat,
  isOpen,
  setIsOpen,
  refreshHistory,
  sidebarWidth,
  setSidebarWidth,
  minSidebarWidth,
  maxSidebarWidth
}) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const resizeStateRef = useRef(null);

  useEffect(() => {
    if (!getToken()) return;

    apiJson("/api/auth/me")
      .then(setUser)
      .catch(() => {
        clearToken();
        navigate("/login", {
          state: { error: "Your session has expired. Please log in again." }
        });
      });
  }, [navigate]);

  async function deleteChat(id, event) {
    event.stopPropagation();

    if (!getToken()) return;

    setHistory(prev => prev.filter(chat => chat._id !== id));

    try {
      await apiJson(`/api/auth/chat/${id}`, {
        method: "DELETE"
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

  function startResize(event) {
    if (window.innerWidth <= 768 || !isOpen) return;

    event.preventDefault();

    resizeStateRef.current = {
      startX: event.clientX,
      startWidth: sidebarWidth
    };

    const onPointerMove = moveEvent => {
      const nextWidth = resizeStateRef.current.startWidth + (moveEvent.clientX - resizeStateRef.current.startX);
      const clampedWidth = Math.min(maxSidebarWidth, Math.max(minSidebarWidth, nextWidth));
      setSidebarWidth(clampedWidth);
    };

    const onPointerUp = () => {
      resizeStateRef.current = null;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  return (
    <aside className={`sidebar ${!isOpen ? "closed" : ""}`}>
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="brand-icon">🏥</div>
          <div className="sidebar-logo">TechFiesta AI</div>
        </div>
        <button className="sidebar-close" onClick={() => setIsOpen(false)} title="Close Sidebar">
          <FiChevronLeft />
        </button>
      </div>

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
          <div className="sidebar-search-wrap">
            <input
              className="sidebar-search-input"
              type="text"
              placeholder="Filter history..."
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
            />
          </div>
        )}
      </nav>

      <div className="sidebar-section sidebar-history">
        <div className="sidebar-label">Recent Consultations</div>

        {filteredHistory.length === 0 ? (
          <div className="sidebar-label sidebar-empty">
            {history.length === 0 ? "No chats yet. Start a new consultation!" : "No matching chats found."}
          </div>
        ) : (
          filteredHistory.map(chat => {
            if (!chat || !chat._id) return null;

            return (
              <div
                key={chat._id}
                className="sidebar-item"
                onClick={event => {
                  if (!event.target.closest(".chat-delete") && loadChat) {
                    loadChat(chat);
                  }
                }}
              >
                <FiMessageSquare className="history-icon" />
                <span className="truncate" style={{ flex: 1 }}>{chat.title || "New Chat"}</span>
                <button
                  className="chat-delete"
                  onClick={event => deleteChat(chat._id, event)}
                  title="Delete Chat"
                >
                  <FiTrash2 />
                </button>
              </div>
            );
          })
        )}
      </div>

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

            <button className="auth-btn profile sidebar-profile-link" onClick={() => navigate("/profile")}>
              <span className="sidebar-profile-link-main">
                <FiActivity style={{ marginRight: 6 }} /> Health Profile
              </span>
              <FiChevronRight />
            </button>

            <button
              className="auth-btn logout"
              onClick={() => {
                clearToken();
                navigate("/login");
              }}
            >
              <FiLogOut style={{ marginRight: 6 }} /> Logout
            </button>
          </>
        ) : (
          <>
            <div className="sidebar-user-card">
              <div className="user-avatar guest-avatar">G</div>
              <div className="user-info">
                <span className="user-name">Guest User</span>
                <span className="user-status user-status-muted">
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

      <button
        type="button"
        className="sidebar-resizer"
        aria-label="Resize sidebar"
        onPointerDown={startResize}
      />
    </aside>
  );
}
