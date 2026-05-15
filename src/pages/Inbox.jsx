import { useNotifications } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const ASSIGNMENT_BADGE = {
  inspector: { label: 'Inspector', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  assignee:  { label: 'Inspector', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  attendee:  { label: 'Attendee',  bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  reviewer:  { label: 'Reviewer',  bg: '#fefce8', color: '#854d0e', border: '#fde047' },
};

function getAssignmentRole(n) {
  const raw = (n.role || n.assigned_role || n.assignment_role || '').toLowerCase();
  if (ASSIGNMENT_BADGE[raw]) return raw;

  const type = (n.type || n.notification_type || '').toLowerCase();
  if (type.includes('inspector') || type.includes('assignee')) return 'inspector';
  if (type.includes('attendee'))  return 'attendee';
  if (type.includes('reviewer'))  return 'reviewer';

  const text = `${n.title || ''} ${n.message || ''}`.toLowerCase();
  if (text.includes('inspector') || text.includes('assigned to inspect')) return 'inspector';
  if (text.includes('attendee')) return 'attendee';
  if (text.includes('reviewer')) return 'reviewer';

  return null;
}

function AssignmentBadge({ notif }) {
  const key = getAssignmentRole(notif);
  if (!key) return null;
  const { label, bg, color, border } = ASSIGNMENT_BADGE[key];
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 999,
      fontSize: '0.72rem', fontWeight: 700,
      background: bg, color, border: `1px solid ${border}`,
    }}>
      {label}
    </span>
  );
}

export default function Inbox() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  const unread = notifications.filter(n => !n.is_read);
  const read   = notifications.filter(n =>  n.is_read);

  return (
    <div>
      <div className="page-header">
        <h1>Inbox</h1>
        {unreadCount > 0 && (
          <button className="btn btn-secondary" onClick={markAllRead}>
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '4rem 2rem',
          color: 'var(--muted)', fontSize: '0.95rem',
        }}>
          Your inbox is empty.
        </div>
      ) : (
        <>
          {unread.length > 0 && (
            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: '0.75rem' }}>
                Unread
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {unread.map(n => (
                  <NotifCard key={n.id} n={n} onRead={() => markRead(n.id)} />
                ))}
              </div>
            </section>
          )}

          {read.length > 0 && (
            <section>
              <h2 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: '0.75rem' }}>
                Read
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {read.map(n => (
                  <NotifCard key={n.id} n={n} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function NotifCard({ n, onRead }) {
  const navigate = useNavigate();

  function handleClick() {
    if (!n.is_read) onRead?.();
    if (!n.action_url) return;
    const scheduleMatch = n.action_url.match(/\/schedules\/(\d+)/);
    if (scheduleMatch) {
      navigate(`/calendar?open=${scheduleMatch[1]}`);
    } else {
      navigate(n.action_url);
    }
  }

  return (
    <div
      onClick={handleClick}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '1rem',
        padding: '1rem 1.25rem',
        background: n.is_read ? 'var(--surface)' : 'var(--bg)',
        border: `1px solid ${n.is_read ? 'var(--border)' : '#bfdbfe'}`,
        borderRadius: 'var(--radius)',
        cursor: n.action_url ? 'pointer' : 'default',
        transition: 'border-color 0.15s',
      }}
    >
      {/* Unread dot */}
      <div style={{ paddingTop: '0.3rem', flexShrink: 0 }}>
        {!n.is_read ? (
          <span style={{
            display: 'block', width: 9, height: 9, borderRadius: '50%',
            background: '#3b82f6',
          }} />
        ) : (
          <span style={{ display: 'block', width: 9, height: 9 }} />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
          <span style={{ fontWeight: n.is_read ? 500 : 700, fontSize: '0.95rem', color: 'var(--text)' }}>
            {n.title}
          </span>
          <AssignmentBadge notif={n} />
        </div>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.5 }}>
          {n.message}
        </p>
        <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.35rem', display: 'block' }}>
          {timeAgo(n.created_at)}
        </span>
      </div>

    </div>
  );
}
