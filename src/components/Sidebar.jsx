import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import { PERMISSIONS } from '../config/permissions';
import ConfirmModal from './ConfirmModal';
import NotificationBell from './NotificationBell';

function Icon({ d, d2 }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, marginRight: '0.6rem' }} aria-hidden="true">
      <path d={d} />
      {d2 && <path d={d2} />}
    </svg>
  );
}

const ICONS = {
  home:        'M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z',
  home2:       'M9 21V12h6v9',
  locations:   'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
  locations2:  'M12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  submissions: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
  submissions2:'M14 2v6h6M16 13H8M16 17H8M10 9H8',
  calendar:    'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  inbox:       'M22 12h-6l-2 3h-4l-2-3H2',
  inbox2:      'M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
  questions:   'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093M12 17h.01',
  questions2:  'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
  adminLoc:    'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9zM9 22V12h6v10',
  users:       'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2',
  users2:      'M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  permissions: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
};

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
            <NavLink to="/" end onClick={close}>
              <Icon d={ICONS.locations} d2={ICONS.locations2} />Locations
            </NavLink>
          ) : (
            <NavLink to={`/location/${location_slug}`} onClick={close}>
              <Icon d={ICONS.home} d2={ICONS.home2} />Home
            </NavLink>
          )}

          {hasPermission(PERMISSIONS.VIEW_SUBMISSIONS) && (
            <NavLink to="/submissions" onClick={close}>
              <Icon d={ICONS.submissions} d2={ICONS.submissions2} />Submissions
            </NavLink>
          )}

          {canSeeSchedule && (
            <NavLink to="/calendar" onClick={close}>
              <Icon d={ICONS.calendar} />Schedule
            </NavLink>
          )}

          <NavLink to="/inbox" onClick={close}>
            <Icon d={ICONS.inbox2} d2={ICONS.inbox} />Inbox
          </NavLink>

          {isGlobalAdmin && (
            <>
              <NavLink to="/admin/questions"   onClick={close}><Icon d={ICONS.questions2} d2={ICONS.questions} />Questions Admin</NavLink>
              <NavLink to="/admin/locations"   onClick={close}><Icon d={ICONS.adminLoc} />Locations Admin</NavLink>
              <NavLink to="/admin/users"       onClick={close}><Icon d={ICONS.users} d2={ICONS.users2} />Manage Users</NavLink>
              <NavLink to="/admin/permissions" onClick={close}><Icon d={ICONS.permissions} />Permissions</NavLink>
            </>
          )}

          {!isGlobalAdmin && (role === 'local_admin' || hasPermission(PERMISSIONS.MANAGE_QUESTIONS)) && (
            <NavLink to="/admin/questions" onClick={close}><Icon d={ICONS.questions2} d2={ICONS.questions} />Questions Admin</NavLink>
          )}
          {!isGlobalAdmin && hasPermission(PERMISSIONS.MANAGE_LOCATIONS) && (
            <NavLink to="/admin/locations" onClick={close}><Icon d={ICONS.adminLoc} />Locations Admin</NavLink>
          )}
          {!isGlobalAdmin && (role === 'local_admin' || hasPermission(PERMISSIONS.REGISTER_USER)) && (
            <NavLink to="/admin/users" onClick={close}><Icon d={ICONS.users} d2={ICONS.users2} />Manage Users</NavLink>
          )}
          {!isGlobalAdmin && hasPermission(PERMISSIONS.MANAGE_PERMISSIONS) && (
            <NavLink to="/admin/permissions" onClick={close}><Icon d={ICONS.permissions} />Permissions</NavLink>
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
