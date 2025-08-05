import React, { useState } from "react";
import "../styles/Navbar.css";

const Navbar = ({ onOpenSidebar }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="navbar">
        <div className="navbar-top">
          <button className="open-sidebar-btn" onClick={onOpenSidebar}>
            ☰ Annotations
          </button>
          <div className="logo">Annotation Video</div>
        </div>
    </nav>
  );
};

export default Navbar;
