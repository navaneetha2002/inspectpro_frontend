import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">InspectPro</Link>
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
        <Link to="/" onClick={() => setMenuOpen(false)}>Locations</Link>
        <Link to="/submissions" onClick={() => setMenuOpen(false)}>Submissions</Link>
        <Link to="/admin/questions" onClick={() => setMenuOpen(false)}>Questions Admin</Link>
        <Link to="/admin/locations" onClick={() => setMenuOpen(false)}>Locations Admin</Link>
      </div>
    </nav>
  );
}