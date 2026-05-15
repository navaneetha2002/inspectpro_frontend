import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const ASSIGNMENT_BADGE = {
  inspector: { label: 'Inspector',      bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  assignee:  { label: 'Inspector',      bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  attendee:  { label: 'Attendee',       bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  reviewer:  { label: 'Reviewer',       bg: '#fefce8', color: '#854d0e', border: '#fde047' },
};

function getAssignmentRole(n) {
  // 1. explicit field from backend
  const raw = (n.role || n.assigned_role || n.assignment_role || '').toLowerCase();
  if (ASSIGNMENT_BADGE[raw]) return raw;

  // 2. notification type field  e.g. "assigned_inspector" / "assigned_attendee"
  const type = (n.type || n.notification_type || '').toLowerCase();
  if (type.includes('inspector') || type.includes('assignee')) return 'inspector';
  if (type.includes('attendee'))  return 'attendee';
  if (type.includes('reviewer'))  return 'reviewer';

  // 3. parse title / message text as last resort
  const text = `${n.title || ''} ${n.message || ''}`.toLowerCase();
  if (text.includes('inspector') || text.includes('assigned to inspect')) return 'inspector';
  if (text.includes('attendee'))  return 'attendee';
  if (text.includes('reviewer'))  return 'reviewer';

  return null;
}

function AssignmentBadge({ notif }) {
  const key = getAssignmentRole(notif);
  if (!key) return null;
  const { label, bg, color, border } = ASSIGNMENT_BADGE[key];
  return (
    <span className="notif-assignment-badge" style={{ background: bg, color, border: `1px solid ${border}` }}>
      {label}
    </span>
  );
}

export default function NotificationBell({ align = 'right' }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const { notifications, unreadCount, markRead, markAllRead, remove, clearAll } = useNotifications();
  const unreadNotifications = notifications.filter(n => !n.is_read);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  return (
    <div className="notif-bell-wrap" ref={wrapRef}>
      <button
        className="notif-bell-btn"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="notif-badge" aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className={`notif-dropdown${align === 'left' ? ' notif-dropdown--left' : ''}`} role="dialog" aria-label="Notifications">
          <div className="notif-header">
            <div className="notif-header-top">
              <span className="notif-title">Notifications</span>
            </div>
            {unreadCount > 0 && (
              <button className="notif-action-link" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>

          <div className="notif-list">
            {unreadNotifications.length === 0 ? (
              <div className="notif-empty">No notifications</div>
            ) : (
              unreadNotifications.map(n => (
                <div
                  key={n.id}
                  className={`notif-item${n.is_read ? '' : ' unread'}`}
                  onClick={() => !n.is_read && markRead(n.id)}
                >
                  <div className="notif-item-body">
                    {!n.is_read && <span className="notif-dot" aria-hidden="true" />}
                    <div className="notif-item-text">
                      <span className="notif-item-title">{n.title}</span>
                      <AssignmentBadge notif={n} />
                      <span className="notif-item-msg">{n.message}</span>
                      <span className="notif-item-time">{timeAgo(n.created_at)}</span>
                    </div>
                  </div>
                  <button
                    className="notif-item-delete"
                    aria-label="Dismiss notification"
                    onClick={e => { e.stopPropagation(); remove(n.id); }}
                  >
                    &times;
                  </button>
                </div>
              ))
            )}
          </div>

          {unreadNotifications.length > 0 && (
            <div className="notif-footer">
              <button className="notif-action-link notif-clear" onClick={clearAll}>
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
