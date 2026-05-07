import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import { PERMISSIONS } from '../config/permissions';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, clearToken, isGlobalAdmin, location_slug } = useAuth();
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
            {isGlobalAdmin ? (
              <NavLink to="/" end onClick={close}>Locations</NavLink>
            ) : (
              <NavLink to={`/location/${location_slug}`} onClick={close}>Home</NavLink>
            )}

            {hasPermission(PERMISSIONS.VIEW_SUBMISSIONS) && (
              <NavLink to="/submissions" onClick={close}>Submissions</NavLink>
            )}

            {isGlobalAdmin && (
              <>
                <NavLink to="/admin/questions"   onClick={close}>Questions Admin</NavLink>
                <NavLink to="/admin/locations"   onClick={close}>Locations Admin</NavLink>
                <NavLink to="/admin/register"    onClick={close}>Register User</NavLink>
                <NavLink to="/admin/permissions" onClick={close}>Permissions</NavLink>
              </>
            )}

            {!isGlobalAdmin && hasPermission(PERMISSIONS.MANAGE_QUESTIONS) && (
              <NavLink to="/admin/questions" onClick={close}>Questions Admin</NavLink>
            )}
            {!isGlobalAdmin && hasPermission(PERMISSIONS.MANAGE_LOCATIONS) && (
              <NavLink to="/admin/locations" onClick={close}>Locations Admin</NavLink>
            )}
            {!isGlobalAdmin && hasPermission(PERMISSIONS.REGISTER_USER) && (
              <NavLink to="/admin/register" onClick={close}>Register User</NavLink>
            )}
            {!isGlobalAdmin && hasPermission(PERMISSIONS.MANAGE_PERMISSIONS) && (
              <NavLink to="/admin/permissions" onClick={close}>Permissions</NavLink>
            )}

            <button className="btn-logout" onClick={handleLogout}>Logout</button>
          </>
        )}
      </div>
    </nav>
  );
}