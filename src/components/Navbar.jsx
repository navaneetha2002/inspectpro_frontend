import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const [menuOpen, setMenuOpen]     = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { isAuthenticated, clearToken, user } = useAuth();
  const navigate = useNavigate();

  const initials = user
    ? (user.username || user.name || user.email || '?').slice(0, 2).toUpperCase()
    : '?';

  function handleLogout() {
    clearToken();
    setMenuOpen(false);
    setProfileOpen(false);
    navigate('/login', { replace: true });
  }

  return (
    <>
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
          {isAuthenticated && (
            <>
              <NavLink to="/" end onClick={() => setMenuOpen(false)}>Locations</NavLink>
              <NavLink to="/submissions" onClick={() => setMenuOpen(false)}>Submissions</NavLink>
              <NavLink to="/admin/questions" onClick={() => setMenuOpen(false)}>Questions Admin</NavLink>
              <NavLink to="/admin/locations" onClick={() => setMenuOpen(false)}>Locations Admin</NavLink>
            </>
          )}
        </div>
        {isAuthenticated && (
          <button
            className="nav-avatar"
            onClick={() => setProfileOpen(true)}
            title="My Profile"
          >
            {initials}
          </button>
        )}
      </nav>

      {profileOpen && user && (
        <div className="profile-modal-overlay" onClick={() => setProfileOpen(false)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-avatar">{initials}</div>
            <h3 className="profile-modal-name">{user.username || user.name || user.email || 'User'}</h3>
            <dl className="profile-modal-fields">
              {(user.id  || user._id || user.userId || user.sub) && <><dt>User ID</dt><dd>{user.id || user._id || user.userId || user.sub}</dd></>}
              {(user.email || user.emailId)                       && <><dt>Email</dt><dd>{user.email || user.emailId}</dd></>}
              {user.role                                           && <><dt>Role</dt><dd>{user.role}</dd></>}
              {(user.location || user.city)                       && <><dt>Location</dt><dd>{user.location || user.city}</dd></>}
            </dl>
            <button className="btn btn-danger" style={{ width: '100%', marginTop: '1rem' }} onClick={handleLogout}>Logout</button>
            <button className="profile-modal-close" onClick={() => setProfileOpen(false)} aria-label="Close">&times;</button>
          </div>
        </div>
      )}
    </>
  );
}