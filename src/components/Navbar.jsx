import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import { PERMISSIONS } from '../config/permissions';
import ConfirmModal from './ConfirmModal';

export default function Navbar() {
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [profileOpen,   setProfileOpen]   = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  const { isAuthenticated, clearToken, isGlobalAdmin, location_slug, username, role, isScheduleAttendee } = useAuth();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();

  function handleLogout() {
    clearToken();
    setMenuOpen(false);
    setProfileOpen(false);
    setLogoutConfirm(false);
    navigate('/login', { replace: true });
  }

  const close = () => setMenuOpen(false);

   // Show schedule if: global admin, local_admin, inspector, coordinator,
  // has explicit VIEW_SCHEDULES permission, or is an attendee on any schedule
  const canSeeSchedule =
    isGlobalAdmin ||
    role === 'local_admin' ||
    role === 'inspector' ||
    role === 'coordinator' ||
    hasPermission(PERMISSIONS.VIEW_SCHEDULES) ||
    isScheduleAttendee;

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
              {isGlobalAdmin ? (
                <NavLink to="/" end onClick={close}>Locations</NavLink>
              ) : (
                <NavLink to={`/location/${location_slug}`} onClick={close}>Home</NavLink>
              )}

              {hasPermission(PERMISSIONS.VIEW_SUBMISSIONS) && (
                <NavLink to="/submissions" onClick={close}>Submissions</NavLink>
              )}

              {canSeeSchedule && (
                <NavLink to="/calendar" onClick={close}>Schedule</NavLink>
              )}

              {isGlobalAdmin && (
                <>
                  <NavLink to="/admin/questions"   onClick={close}>Questions Admin</NavLink>
                  <NavLink to="/admin/locations"   onClick={close}>Locations Admin</NavLink>
                  <NavLink to="/admin/users"       onClick={close}>Manage Users</NavLink>
                  <NavLink to="/admin/permissions" onClick={close}>Permissions</NavLink>
                </>
              )}

              {!isGlobalAdmin && (role === 'local_admin' || hasPermission(PERMISSIONS.MANAGE_QUESTIONS)) && (
                <NavLink to="/admin/questions" onClick={close}>Questions Admin</NavLink>
              )}
              {!isGlobalAdmin && hasPermission(PERMISSIONS.MANAGE_LOCATIONS) && (
                <NavLink to="/admin/locations" onClick={close}>Locations Admin</NavLink>
              )}
              {!isGlobalAdmin && (role === 'local_admin' || hasPermission(PERMISSIONS.REGISTER_USER)) && (
                <NavLink to="/admin/users" onClick={close}>Manage Users</NavLink>
              )}
              {!isGlobalAdmin && hasPermission(PERMISSIONS.MANAGE_PERMISSIONS) && (
                <NavLink to="/admin/permissions" onClick={close}>Permissions</NavLink>
              )}

              <button
                className="navbar-avatar"
                onClick={() => setProfileOpen(p => !p)}
                aria-label="Profile"
              >
                {(username || '?').slice(0, 2).toUpperCase()}
              </button>
            </>
          )}
        </div>
      </nav>

      {profileOpen && (
        <div className="profile-modal-overlay" onClick={() => setProfileOpen(false)}>
          <div className="profile-modal" onClick={e => e.stopPropagation()}>
            <div className="profile-modal-avatar">
              {(username || '?').slice(0, 2).toUpperCase()}
            </div>
            <h3 className="profile-modal-name">{username || 'User'}</h3>
            <dl className="profile-modal-fields">
              {role && (
                <><dt>Role</dt><dd>{role}</dd></>
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