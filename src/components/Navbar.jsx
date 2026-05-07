import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import { PERMISSIONS } from '../config/permissions';
import ConfirmModal from './ConfirmModal';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, clearToken, isGlobalAdmin, location_slug } = useAuth();
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [profileOpen,   setProfileOpen]   = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const { isAuthenticated, clearToken, role, user } = useAuth();
  const { hasPermission } = usePermissions();
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

  const close = () => setMenuOpen(false);

  return (
    <>
      <nav className="navbar">
        <NavLink to="/" className="nav-brand">InspectPro</NavLink>

        <button
          className="hamburger"
          aria-label="Toggle menu"
          onClick={() => setMenuOpen(open => !open)}
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
                <NavLink to="/admin/users" onClick={close}>Manage Users</NavLink>
              )}
              {hasPermission(role, PERMISSIONS.MANAGE_PERMISSIONS) && (
                <NavLink to="/admin/permissions" onClick={close}>Permissions</NavLink>
              )}
              
            </>
          )}
        </div>

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
          <div className="profile-modal" onClick={e => e.stopPropagation()}>
            <div className="profile-modal-avatar">{initials}</div>
            <h3 className="profile-modal-name">
              {user.username || user.name || user.email || 'User'}
            </h3>
            <dl className="profile-modal-fields">
              {(user.id || user._id || user.userId || user.sub) && (
                <><dt>User ID</dt><dd>{user.id || user._id || user.userId || user.sub}</dd></>
              )}
              {(user.email || user.emailId) && (
                <><dt>Email</dt><dd>{user.email || user.emailId}</dd></>
              )}
              {user.role && (
                <><dt>Role</dt><dd>{user.role}</dd></>
              )}
              {(user.location || user.city) && (
                <><dt>Location</dt><dd>{user.location || user.city}</dd></>
              )}
            </dl>
            <button
              className="btn btn-danger"
              style={{ width: '100%', marginTop: '1rem' }}
              onClick={() => setLogoutConfirm(true)}
            >
              Logout
            </button>
            <button
              className="profile-modal-close"
              onClick={() => setProfileOpen(false)}
              aria-label="Close"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {logoutConfirm && (
        <ConfirmModal
          title="Sign out"
          message="Are you sure you want to log out?"
          confirmLabel="Logout"
          danger
          onConfirm={handleLogout}
          onCancel={() => setLogoutConfirm(false)}
        />
      )}
    </>
  );
}