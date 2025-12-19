import React from "react";
import {
  FiPlus,
  FiSearch,
  FiBook,
  FiFolder,
  FiMessageSquare,
  FiChevronLeft
} from "react-icons/fi";


export default function Sidebar({
  history,
  loadChat,
  newChat,
  isOpen,
  setIsOpen
}) {
  if (!isOpen) return null;

  return (
    <aside className="sidebar">

      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">TechFiesta AI</div>
        <button
          className="sidebar-close"
          onClick={() => setIsOpen(false)}
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
        >
          <FiChevronLeft />
        </button>
      </div>

      {/* Primary actions */}
      <nav className="sidebar-section">
        <div className="sidebar-item" onClick={newChat}>
          <FiPlus />
          <span>New chat</span>
        </div>

        <div className="sidebar-item">
          <FiSearch />
          <span>Search chats</span>
        </div>

        <div className="sidebar-item">
          <FiBook />
          <span>Library</span>
        </div>

        <div className="sidebar-item">
          <FiFolder />
          <span>Projects</span>
        </div>
      </nav>

      {/* Chat history */}
      <div className="sidebar-section sidebar-history">
        <div className="sidebar-label">Your chats</div>

        {history.map((chat, i) => (
          <div
            key={i}
            className="sidebar-item"
            onClick={() => loadChat(chat)}
          >
            <FiMessageSquare />
            <span className="truncate">{chat.title}</span>
          </div>
        ))}
      </div>

    </aside>
  );
}
