import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import { PERMISSIONS } from '../config/permissions';
import ConfirmModal from './ConfirmModal';
import NotificationBell from './NotificationBell';

export default function Sidebar() {
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [profileOpen,   setProfileOpen]   = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const { isAuthenticated, clearToken, isGlobalAdmin, location_slug, user, username, role, isScheduleAttendee } = useAuth();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();

  if (!isAuthenticated) return null;

  function handleLogout() {
    clearToken();
    setSidebarOpen(false);
    setProfileOpen(false);
    setLogoutConfirm(false);
    navigate('/login', { replace: true });
  }

  const close = () => setSidebarOpen(false);

  const canSeeSchedule =
    isGlobalAdmin ||
    role === 'local_admin' ||
    role === 'inspector' ||
    role === 'coordinator' ||
    hasPermission(PERMISSIONS.VIEW_SCHEDULES) ||
    isScheduleAttendee;

  return (
    <>
      {/* Mobile topbar */}
      <div className="sidebar-topbar">
        <button
          className="hamburger"
          aria-label="Toggle menu"
          onClick={() => setSidebarOpen(o => !o)}
        >
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </button>
        <span className="sidebar-topbar-brand">InspectPro</span>
      </div>

      {/* Backdrop */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={close} />}

      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <NavLink to="/" className="sidebar-brand" onClick={close}>
          InspectPro
        </NavLink>

        <nav className="sidebar-links">
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

          <NavLink to="/inbox" onClick={close}>Inbox</NavLink>

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
        </nav>

        <div className="sidebar-footer" onClick={() => setProfileOpen(p => !p)}>
          <button className="sidebar-avatar" aria-label="Profile">
            {(username || '?').slice(0, 2).toUpperCase()}
          </button>
          <div className="sidebar-user-info">
            <span className="sidebar-username">{username || 'User'}</span>
            {role && <span className="sidebar-role">{role}</span>}
          </div>
        </div>
      </aside>

      {profileOpen && (
        <div className="profile-modal-overlay" onClick={() => setProfileOpen(false)}>
          <div className="profile-modal" onClick={e => e.stopPropagation()}>
            <div className="profile-modal-avatar">
              {(username || '?').slice(0, 2).toUpperCase()}
            </div>
            <h3 className="profile-modal-name">{username || 'User'}</h3>
            <dl className="profile-modal-fields">
              {role && (<><dt>Role</dt><dd>{role}</dd></>)}
              {(user?.location || location_slug) && (
                <><dt>Location</dt><dd>{user?.location || location_slug}</dd></>
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

      {/* Fixed top-right notification bell */}
      <div className="notif-fixed-bell">
        <NotificationBell />
      </div>
    </>
  );
}
