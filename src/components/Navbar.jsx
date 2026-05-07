import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import { PERMISSIONS } from '../config/permissions';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, clearToken, role } = useAuth();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();

  function handleLogout() {
    clearToken();
    setMenuOpen(false);
    navigate('/login', { replace: true });
  }

  const close = () => setMenuOpen(false);

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
        {isAuthenticated && (
          <>
            <NavLink to="/" end onClick={close}>Locations</NavLink>
            {hasPermission(role, PERMISSIONS.VIEW_SUBMISSIONS) && (
              <NavLink to="/submissions" onClick={close}>Submissions</NavLink>
            )}
            {hasPermission(role, PERMISSIONS.ADMIN_QUESTIONS) && (
              <NavLink to="/admin/questions" onClick={close}>Questions Admin</NavLink>
            )}
            {hasPermission(role, PERMISSIONS.ADMIN_LOCATIONS) && (
              <NavLink to="/admin/locations" onClick={close}>Locations Admin</NavLink>
            )}
            {hasPermission(role, PERMISSIONS.REGISTER_USER) && (
              <NavLink to="/admin/register" onClick={close}>Register User</NavLink>
            )}
            {hasPermission(role, PERMISSIONS.MANAGE_PERMISSIONS) && (
              <NavLink to="/admin/permissions" onClick={close}>Permissions</NavLink>
            )}
            <button className="btn-logout" onClick={handleLogout}>Logout</button>
          </>
        )}
      </div>
    </nav>
  );
}