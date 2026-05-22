import { useState } from 'react';
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

const BADGE_CLASSES = {
  inspector: 'badge bg-primary-subtle text-primary border border-primary-subtle',
  assignee:  'badge bg-primary-subtle text-primary border border-primary-subtle',
  attendee:  'badge bg-success-subtle text-success border border-success-subtle',
  reviewer:  'badge bg-warning-subtle text-warning-emphasis border border-warning-subtle',
};

function AssignmentBadge({ notif }) {
  const key = getAssignmentRole(notif);
  if (!key) return null;
  return (
    <span className={BADGE_CLASSES[key]} style={{ fontSize: '0.72rem' }}>
      {ASSIGNMENT_BADGE[key].label}
    </span>
  );
}

// Returns the most meaningful short title from the notification:
// 1. Quoted name from "assigned for: "test15"" messages
// 2. Part after " — " for compound titles like "Review Submitted — Round 2 Ready"
// 3. Falls back to the raw title
function extractInspectionTitle(message, title) {
  if (message) {
    const nameMatch = message.match(/for:\s*"([^"]+)"/i);
    if (nameMatch) return nameMatch[1];
  }
  if (title && title.includes(' — ')) {
    return title.split(' — ').pop().trim();
  }
  return title || null;
}
// Resolve a notification to its submission UUID.
// Handles both /submissions/UUID and /schedules/ID action URLs.
function getSubmissionId(n, scheduleIdToUuid = {}) {
  if (!n.action_url) return null;
  const subMatch = n.action_url.match(/\/submissions\/([\w-]+)/);
  if (subMatch) return subMatch[1];
  const schedMatch = n.action_url.match(/\/schedules\/(\d+)/);
  if (schedMatch) return scheduleIdToUuid[schedMatch[1]] || null;
  return null;
}

export default function Inbox() {
  const { notifications, unreadCount, markRead, markAllRead, submissionTitleMap, approvedSubmissionIds, scheduleIdToUuid } = useNotifications();
  const [showCompleted, setShowCompleted] = useState(false);

  // A notification is "completed" if its submission is approved
  function isCompleted(n) {
    const submissionId = getSubmissionId(n, scheduleIdToUuid);
    return submissionId ? approvedSubmissionIds.has(submissionId) : false;
  }

  const filtered    = showCompleted ? notifications.filter(isCompleted) : notifications.filter(n => !isCompleted(n));
  const hiddenCount = notifications.filter(isCompleted).length;
  const unread      = filtered.filter(n => !n.is_read);
  const read        = filtered.filter(n =>  n.is_read);

  return (
    <div>
      <div className="sticky-top bg-white border-bottom py-2 mb-3">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-1">
            <li className="breadcrumb-item active">Inbox</li>
          </ol>
        </nav>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-0">
          <h1 className="h4 fw-bold mb-0">Inbox</h1>
          <div className="d-flex gap-2 align-items-center flex-wrap">
            <button
              className={`btn btn-sm ${showCompleted ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setShowCompleted(v => !v)}>
              {showCompleted
                ? 'Hide Completed Tasks'
                : `Show Completed Tasks${hiddenCount > 0 ? ` (${hiddenCount})` : ''}`}
            </button>
            {unreadCount > 0 && (
              <button className="btn btn-sm btn-secondary" onClick={markAllRead}>
                Mark all as read
              </button>
            )}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-muted py-5">
          Your inbox is empty.
        </div>
      ) : (
        <>
          {unread.length > 0 && (
            <section className="mb-4">
              <p className="text-uppercase text-muted fw-bold mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.06em' }}>
                Unread
              </p>
              <div className="d-flex flex-column gap-2">
                {unread.map(n => (
                  <NotifCard key={n.id} n={n} onRead={() => markRead(n.id)} submissionTitleMap={submissionTitleMap} />
                ))}
              </div>
            </section>
          )}

          {read.length > 0 && (
            <section>
              <p className="text-uppercase text-muted fw-bold mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.06em' }}>
                Read
              </p>
              <div className="d-flex flex-column gap-2">
                {read.map(n => (
                  <NotifCard key={n.id} n={n} submissionTitleMap={submissionTitleMap} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function NotifCard({ n, onRead, submissionTitleMap = {} }) {
  const navigate = useNavigate();
  const submissionUuid = n.action_url?.match(/\/submissions\/([\w-]+)/)?.[1];
  const inspectionTitle = submissionUuid ? submissionTitleMap[submissionUuid] : null;

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
      className={`d-flex align-items-start gap-3 p-3 border rounded ${!n.is_read ? 'border-primary-subtle' : ''}`}
      style={{ cursor: n.action_url ? 'pointer' : 'default', background: n.is_read ? 'var(--surface)' : 'var(--bg)' }}>

      {/* Unread dot */}
      <div className="pt-1 flex-shrink-0">
        {!n.is_read
          ? <span style={{ display: 'block', width: 9, height: 9, borderRadius: '50%', background: '#3b82f6' }} />
          : <span style={{ display: 'block', width: 9, height: 9 }} />}
      </div>

      {/* Content */}
      <div className="flex-fill" style={{ minWidth: 0 }}>
        {inspectionTitle && (
          <div className="mb-1">
            <span className="badge bg-primary-subtle text-primary border border-primary-subtle" style={{ fontSize: '0.72rem' }}>
              {inspectionTitle}
            </span>
          </div>
        )}
        <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
          <span className={n.is_read ? 'fw-medium' : 'fw-bold'} style={{ fontSize: '0.95rem' }}>
            {extractInspectionTitle(n.message, n.title)}
          </span>
          <AssignmentBadge notif={n} />
        </div>
        <p className="mb-0 text-muted small">{n.message}</p>
        <span className="d-block mt-1 text-secondary" style={{ fontSize: '0.75rem' }}>
          {timeAgo(n.created_at)}
        </span>
      </div>
    </div>
  );
}

