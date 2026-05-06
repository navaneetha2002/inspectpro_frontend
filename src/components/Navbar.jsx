import { NavLink } from 'react-router-dom';
import { useState } from 'react';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <nav className="navbar">
      <NavLink to="/" className="nav-brand">InspectPro</NavLink>
      <button
        className="hamburger"
        aria-label="Toggle menu"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span className="bar"></span>
        <span className="bar"></span>
        <span className="bar"></span>
      </button>
      <div className={`nav-links${menuOpen ? ' open' : ''}`}>
        <NavLink to="/" end onClick={() => setMenuOpen(false)}>Locations</NavLink>
        <NavLink to="/submissions" onClick={() => setMenuOpen(false)}>Submissions</NavLink>
        <NavLink to="/admin/questions" onClick={() => setMenuOpen(false)}>Questions Admin</NavLink>
        <NavLink to="/admin/locations" onClick={() => setMenuOpen(false)}>Locations Admin</NavLink>
      </div>
    </nav>
  );
}