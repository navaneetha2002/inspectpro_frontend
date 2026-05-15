import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationBell({ align = 'right' }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const { notifications, unreadCount, markRead, markAllRead, remove, clearAll } = useNotifications();

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
            <span className="notif-title">Notifications</span>
            {unreadCount > 0 && (
              <button className="notif-action-link" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>

          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">No notifications</div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`notif-item${n.is_read ? '' : ' unread'}`}
                  onClick={() => !n.is_read && markRead(n.id)}
                >
                  <div className="notif-item-body">
                    {!n.is_read && <span className="notif-dot" aria-hidden="true" />}
                    <div className="notif-item-text">
                      <span className="notif-item-title">{n.title}</span>
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

          {notifications.length > 0 && (
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
