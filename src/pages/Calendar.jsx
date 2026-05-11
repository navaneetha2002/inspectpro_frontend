import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import { PERMISSIONS } from '../config/permissions';
import {
  getSchedules,
  createSchedule,
  updateSchedule,
  updateScheduleStatus,
  deleteSchedule,
  getInspectors,
  getAttendees,
  getCategories,
  getLocations,
} from '../api/api';

const STATUS_COLOR = {
  pending:     '#3b82f6',
  in_progress: '#f59e0b',
  completed:   '#10b981',
  cancelled:   '#6b7280',
};

const STATUS_LABEL = {
  pending:     'Pending',
  in_progress: 'In Progress',
  completed:   'Completed',
  cancelled:   'Cancelled',
};

const EMPTY_FORM = {
  title: '', assigned_to: '', attendee_id: '', category_id: '',
  location_id: '', scheduled_at: '', notes: '',
};

export default function CalendarPage() {
  const { isGlobalAdmin, userId, role } = useAuth();
  const { hasPermission } = usePermissions();

  const navigate  = useNavigate();
  const isAdmin   = isGlobalAdmin || role === 'local_admin';
  const canCreate = isAdmin || role === 'coordinator' || hasPermission(PERMISSIONS.CREATE_SCHEDULE);
  const canManage = isAdmin || hasPermission(PERMISSIONS.MANAGE_SCHEDULES);

  const [events,        setEvents]        = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showForm,      setShowForm]      = useState(false);
  const [form,          setForm]          = useState(EMPTY_FORM);
  const [inspectors, setInspectors] = useState([]);
  const [attendees, setAttendees] = useState([]);
  const [categories,    setCategories]    = useState([]);
  const [locations,     setLocations]     = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [submitting,    setSubmitting]    = useState(false);
  const [error,         setError]         = useState(null);

  const loadSchedules = useCallback(async () => {
    try {
      console.log('[Calendar] loadSchedules: fetching schedules for userId=', userId, 'role=', role);
      const { data } = await getSchedules();
      console.log('[Calendar] raw API response:', data);
      const rows = Array.isArray(data) ? data : [];
      console.log('[Calendar] total schedules received:', rows.length);
      rows.forEach(s => {
        console.log(`[Calendar] schedule id=${s.id} title="${s.title}" assigned_to=${s.assigned_to} created_by=${s.created_by} attendee_id=${s.attendee_id} status=${s.status}`);
      });
      setEvents(
        rows.map(s => ({
          id:              String(s.id),
          title:           s.title || `${s.category_name} @ ${s.location_name}`,
          start:           s.scheduled_at,
          backgroundColor: STATUS_COLOR[s.status] ?? '#6b7280',
          borderColor:     STATUS_COLOR[s.status] ?? '#6b7280',
          extendedProps:   s,
        }))
      );
    } catch (err) {
      console.error('[Calendar] loadSchedules error:', err?.response?.status, err?.response?.data, err);
      setError('Failed to load schedules.');
    } finally {
      setLoading(false);
    }
  }, [userId, role]);

  useEffect(() => {
    loadSchedules();
    if (canCreate || canManage) {
      Promise.all([
  getInspectors(),
  getAttendees(),
  getCategories(),
  getLocations()
]).then(
  ([i, a, c, l]) => {
    setInspectors(Array.isArray(i.data) ? i.data : []);
    setAttendees(Array.isArray(a.data) ? a.data : []);
    setCategories(Array.isArray(c.data) ? c.data : []);
    setLocations(Array.isArray(l.data) ? l.data : []);
  }
).catch((err) => console.error('Failed to load form data:', err));
    }
  }, [canCreate, canManage, loadSchedules]);

  function handleEventClick({ event }) {
    const props = event.extendedProps;
    console.log('[Calendar] event clicked - full schedule data:', props);
    console.log('[Calendar] attendee_id stored in schedule:', props.attendee_id, '| attendee_name:', props.attendee_name);
    setSelectedEvent(props);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSubmitting(true);
    console.log('[Calendar] submitting schedule with form data:', form);
    try {
      await createSchedule({
        title:        form.title,
        assigned_to:  Number(form.assigned_to),
        attendee_id:  form.attendee_id  ? Number(form.attendee_id)  : null,
        category_id:  form.category_id  ? Number(form.category_id)  : null,
        location_id:  form.location_id  ? Number(form.location_id)  : null,
        scheduled_at: form.scheduled_at,
        notes:        form.notes || null,
      });
      setShowForm(false);
      setForm(EMPTY_FORM);
      await loadSchedules();
    } catch {
      setError('Failed to create schedule.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatus(id, newStatus) {
    try {
      await updateScheduleStatus(id, newStatus);
      setSelectedEvent(null);
      await loadSchedules();
    } catch {
      setError('Failed to update status.');
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this schedule?')) return;
    try {
      await deleteSchedule(id);
      setSelectedEvent(null);
      await loadSchedules();
    } catch {
      setError('Failed to delete schedule.');
    }
  }

  const sel = selectedEvent;

  const isAssignedInspector = sel && String(sel.assigned_to) === String(userId);
  const isCreator           = sel && String(sel.created_by)  === String(userId);
  const isAttendee          = sel && String(sel.attendee_id) === String(userId);
  // Attendees can view schedule details but cannot drive the inspection
 const isCoordinator    = role === 'coordinator';
const canActOnSchedule = !isCoordinator && (isAdmin || isAssignedInspector || isCreator);

  if (loading) return <p style={{ padding: '2rem', color: '#6b7280' }}>Loading…</p>;

  return (
    <div>
      <div className="page-header">
        <h1>Inspection Schedule</h1>
        {canCreate && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            + New Schedule
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-info" style={{ borderColor: '#fecaca', background: '#fef2f2', color: '#b91c1c', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'inherit' }}>×</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {Object.entries(STATUS_LABEL).map(([key, label]) => (
          <span key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 500 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLOR[key], display: 'inline-block', flexShrink: 0 }} />
            {label}
          </span>
        ))}
      </div>

      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)', padding: '1.25rem' }}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
          events={events}
          eventClick={handleEventClick}
          height="auto"
          eventDisplay="block"
        />
      </div>

      {/* ── Create Schedule Modal ── */}
      {showForm && canCreate && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <h2 className="modal-title">New Inspection Schedule</h2>
            <p className="modal-message" style={{ marginBottom: '1.25rem' }}>
              Assign an inspector to a category and location.
            </p>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Title <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Monthly fire safety check"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Assign To <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select
                    required
                    className="form-input"
                    value={form.assigned_to}
                    onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
                  >
                    <option value="">Select inspector…</option>
                    {inspectors.map(u => (
                      <option key={u.id} value={u.id}>{u.username}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    Attendee{' '}
                    <small style={{ fontWeight: 400, color: 'var(--muted)' }}>(location side)</small>
                  </label>
                  <select
                    className="form-input"
                    value={form.attendee_id}
                    onChange={e => setForm(f => ({ ...f, attendee_id: e.target.value }))}
                  >
                    <option value="">Select attendee…</option>
                    {attendees.map(u => (
                      <option key={u.id} value={u.id}>{u.username}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    className="form-input"
                    value={form.category_id}
                    onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                  >
                    <option value="">Select category…</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Location</label>
                  <select
                    className="form-input"
                    value={form.location_id}
                    onChange={e => setForm(f => ({ ...f, location_id: e.target.value }))}
                  >
                    <option value="">Select location…</option>
                    {locations.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Scheduled At <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  type="datetime-local"
                  required
                  className="form-input"
                  value={form.scheduled_at}
                  onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label>Notes <small style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</small></label>
                <textarea
                  className="form-input form-textarea"
                  rows={2}
                  placeholder="Any additional instructions…"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving…' : 'Create Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Event Detail Modal ── */}
      {sel && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h2 className="modal-title">{sel.title}</h2>
                {sel.category_name && (
                  <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                    {sel.category_name}{sel.location_name ? ` @ ${sel.location_name}` : ''}
                  </span>
                )}
              </div>
              <span style={{
                background: STATUS_COLOR[sel.status] ?? '#6b7280',
                color: '#fff', borderRadius: 6, padding: '3px 10px',
                fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap',
                marginLeft: '0.75rem', alignSelf: 'center',
              }}>
                {STATUS_LABEL[sel.status] ?? sel.status}
              </span>
            </div>

            <div style={{ background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: '1.25rem' }}>
              <DetailRow label="Assigned To" value={sel.assigned_to_name || `User #${sel.assigned_to}`} />
              <DetailRow label="Attendee"    value={sel.attendee_name    || '—'} />
              <DetailRow label="Created By"  value={sel.created_by_name  || '—'} />
              <DetailRow label="Scheduled"   value={new Date(sel.scheduled_at).toLocaleString()} />
              {sel.submission_id && (
                <DetailRow label="Submission ID" value={`#${sel.submission_id}`} />
              )}
              {sel.notes && <DetailRow label="Notes" value={sel.notes} last />}
            </div>

            <div className="modal-actions" style={{ flexWrap: 'wrap', gap: '0.6rem' }}>

              {/* Attendee-only view — info banner + view response when done */}
              {isAttendee && !canActOnSchedule && (
                <>
                  
                  {sel.status === 'completed' && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setSelectedEvent(null);
                        const uuid = sel.submission_uuid
                          || localStorage.getItem(`schedule_submission_${sel.id}`);
                        if (uuid) {
                          navigate(`/submissions/${uuid}`);
                        }
                      }}
                    >
                      View Response
                    </button>
                  )}
                </>
              )}

              {/* Start Inspection — pending schedules, assignee or creator */}
              {sel.status === 'pending' && canActOnSchedule && (
                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    try {
                      await updateScheduleStatus(sel.id, 'in_progress');
                      setSelectedEvent(null);
                      await loadSchedules();
                      if (sel.category_slug) {
                        const p = new URLSearchParams();
                        if (sel.location_slug) p.set('location', sel.location_slug);
                        p.set('schedule_id', sel.id);
                        navigate(`/form/${sel.category_slug}?${p.toString()}`);
                      }
                    } catch {
                      setError('Failed to start inspection.');
                    }
                  }}
                >
                  Start Inspection
                </button>
              )}

              {/* Open Form — in_progress, assignee or creator */}
              {sel.status === 'in_progress' && canActOnSchedule && sel.category_slug && (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setSelectedEvent(null);
                    const p = new URLSearchParams();
                    if (sel.location_slug) p.set('location', sel.location_slug);
                    p.set('schedule_id', sel.id);
                    navigate(`/form/${sel.category_slug}?${p.toString()}`);
                  }}
                >
                  Open Form
                </button>
              )}

              {/* Mark Complete — in_progress, assignee or creator */}
              {sel.status === 'in_progress' && canActOnSchedule && (
                <button className="btn btn-success" onClick={() => handleStatus(sel.id, 'completed')}>
                  Mark Complete
                </button>
              )}

              {/* View Response — completed schedules */}
              {sel.status === 'completed' && canActOnSchedule && (
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setSelectedEvent(null);
                    const uuid = sel.submission_uuid
                      || localStorage.getItem(`schedule_submission_${sel.id}`);
                    if (uuid) {
                      navigate(`/submissions/${uuid}`);
                    } else if (sel.category_slug) {
                      const p = new URLSearchParams();
                      if (sel.location_slug) p.set('location', sel.location_slug);
                      p.set('schedule_id', sel.id);
                      navigate(`/form/${sel.category_slug}?${p.toString()}`);
                    }
                  }}
                >
                  View Response
                </button>
              )}

              {/* Delete — admins and creators only, not if completed */}
              {(canManage || isCreator) && sel.status !== 'completed' && (
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(sel.id)}>
                  Delete
                </button>
              )}

              <button className="btn btn-secondary" onClick={() => setSelectedEvent(null)} style={{ marginLeft: 'auto' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, last }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '0.65rem 1rem', borderBottom: last ? 'none' : '1px solid var(--border)',
      fontSize: '0.9rem',
    }}>
      <span style={{ color: 'var(--muted)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </span>
      <span style={{ color: 'var(--text)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}