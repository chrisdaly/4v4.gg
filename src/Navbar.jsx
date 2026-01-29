import React from "react";
import { Link, useLocation } from "react-router-dom";

const Navbar = () => {
  const location = useLocation();

  const isActive = (path) => {
    if (path === "/ongoing") {
      return location.pathname === "/" || location.pathname === "/ongoing";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <Link to="/" className="navbar-logo">
          4v4.GG
        </Link>
        <div className="navbar-links">
          <Link
            to="/ongoing"
            className={`navbar-link ${isActive("/ongoing") ? "active" : ""}`}
          >
            Live Games
          </Link>
          <Link
            to="/finished"
            className={`navbar-link ${isActive("/finished") ? "active" : ""}`}
          >
            Finished
          </Link>
          <Link
            to="/ladder"
            className={`navbar-link ${isActive("/ladder") ? "active" : ""}`}
          >
            Ladder
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
