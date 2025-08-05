import React from "react";
import "../styles/SidebarAnnotation.css";

const SidebarAnnotation = ({ isOpen, onClose, children }) => {
  return (
    <div className={`sidebar ${isOpen ? "open" : ""}`}>
      <div className="sidebar-header">
        <h3>Annotations</h3>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>
      <div className="sidebar-content">
        <div className="flex justify-center">
        <div className="w-full max-w-2xl">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default SidebarAnnotation;
