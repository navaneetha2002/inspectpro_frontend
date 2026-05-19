import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  getInspectorsByExcludingLocation,
  getAttendeesByLocation,
  getLocationCategoriesAssigned,
  getSubmission,
  getRounds,
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
  const { isGlobalAdmin, userId, role, location_id: userLocationId } = useAuth();
  const { hasPermission } = usePermissions();

  const navigate         = useNavigate();
  const [searchParams]   = useSearchParams();
  const isAdmin          = isGlobalAdmin || role === 'local_admin';
  const canCreate        = isAdmin || role === 'coordinator' || hasPermission(PERMISSIONS.CREATE_SCHEDULE);
  const canManage        = isAdmin || hasPermission(PERMISSIONS.MANAGE_SCHEDULES);
  const isLocationLocked = role === 'coordinator' || role === 'local_admin';

  const [events,               setEvents]               = useState([]);
  const [selectedEvent,        setSelectedEvent]        = useState(null);
  const [showForm,             setShowForm]             = useState(false);
  const [form,                 setForm]                 = useState(EMPTY_FORM);
  const [filteredInspectors,   setFilteredInspectors]   = useState([]);
  const [filteredAttendees,    setFilteredAttendees]    = useState([]);
  const [filteredCategories,   setFilteredCategories]   = useState([]);
  const [locationDataLoading,  setLocationDataLoading]  = useState(false);
  const [locations,            setLocations]            = useState([]);
  const [loading,              setLoading]              = useState(true);
  const [submitting,           setSubmitting]           = useState(false);
  const [error,                setError]                = useState(null);
  const [submissionStatus,     setSubmissionStatus]     = useState(null);
  const [submissionRounds,     setSubmissionRounds]     = useState(null);

  const loadSchedules = useCallback(async () => {
    try {
      const { data } = await getSchedules();
      const rows = Array.isArray(data) ? data : [];
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
      console.error('[Calendar] loadSchedules error:', err);
      setError('Failed to load schedules.');
    } finally {
      setLoading(false);
    }
  }, [userId, role]);

  const loadLocationData = useCallback(async (locId) => {
    setFilteredAttendees([]);
    setFilteredInspectors([]);
    setFilteredCategories([]);
    if (!locId) return;
    setLocationDataLoading(true);
    try {
      const [attendeesRes, inspectorsRes, categoriesRes] = await Promise.all([
        getAttendeesByLocation(locId),
        getInspectorsByExcludingLocation(locId),
        getLocationCategoriesAssigned(locId),
      ]);
      setFilteredAttendees(Array.isArray(attendeesRes.data) ? attendeesRes.data : []);
      setFilteredInspectors(Array.isArray(inspectorsRes.data) ? inspectorsRes.data : []);
      setFilteredCategories((Array.isArray(categoriesRes.data) ? categoriesRes.data : []).filter(c => c.assigned));
    } catch {
      setFilteredAttendees([]);
      setFilteredInspectors([]);
      setFilteredCategories([]);
    } finally {
      setLocationDataLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchedules();
    if (canCreate || canManage) {
      getLocations()
        .then(l => setLocations(Array.isArray(l.data) ? l.data : []))
        .catch(err => console.error('Failed to load locations:', err));
    }
  }, [canCreate, canManage, loadSchedules]);

  useEffect(() => {
    const openId = searchParams.get('open');
    if (!openId || !events.length) return;
    const match = events.find(e => e.id === openId);
    if (match) setSelectedEvent(match.extendedProps);
  }, [searchParams, events]);

  useEffect(() => {
    if (showForm && isLocationLocked && userLocationId) {
      setForm(f => ({ ...f, location_id: String(userLocationId), attendee_id: '', assigned_to: '', category_id: '' }));
      loadLocationData(String(userLocationId));
    }
  }, [showForm, isLocationLocked, userLocationId, loadLocationData]);

  function handleEventClick({ event }) {
    const props = event.extendedProps;
    setSelectedEvent(props);
    setSubmissionStatus(null);
    setSubmissionRounds(null);

    if (props.status === 'completed') {
      const uuid = props.submission_uuid
        || localStorage.getItem(`schedule_submission_${props.id}`);
      if (uuid) {
        getSubmission(uuid)
          .then(r => setSubmissionStatus(r.data?.submission ?? null))
          .catch(() => setSubmissionStatus(null));
        getRounds(uuid)
          .then(r => setSubmissionRounds(r.data ?? null))
          .catch(() => setSubmissionRounds(null));
      }
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSubmitting(true);
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
  const isCoordinator       = role === 'coordinator';
  const canActOnSchedule    = !isCoordinator && (isAdmin || isAssignedInspector || isCreator);
  const isScheduledTimeReached = sel ? Date.now() >= new Date(sel.scheduled_at).getTime() : false;

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
        <div className="modal-overlay" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setFilteredAttendees([]); setFilteredInspectors([]); setFilteredCategories([]); }}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <h2 className="modal-title">New Inspection Schedule</h2>
            <p className="modal-message" style={{ marginBottom: '1.25rem' }}>
              Assign an inspector to a category and location.
            </p>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Title <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input type="text" required className="form-input"
                  placeholder="e.g. Monthly fire safety check"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Location <span style={{ color: 'var(--danger)' }}>*</span></label>
                  {isLocationLocked ? (
                    <input className="form-input"
                      value={locations.find(l => String(l.id) === String(userLocationId))?.name ?? ''}
                      readOnly
                      style={{ background: 'var(--input-disabled, #f3f4f6)', cursor: 'not-allowed' }} />
                  ) : (
                    <select required className="form-input" value={form.location_id}
                      onChange={e => {
                        const locId = e.target.value;
                        setForm(f => ({ ...f, location_id: locId, attendee_id: '', assigned_to: '', category_id: '' }));
                        loadLocationData(locId);
                      }}>
                      <option value="">Select location…</option>
                      {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  )}
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select className="form-input" value={form.category_id}
                    disabled={!form.location_id || locationDataLoading}
                    onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                    style={!form.location_id ? { opacity: 0.5, cursor: 'not-allowed' } : {}}>
                    <option value="">
                      {!form.location_id ? 'Select location first…' : locationDataLoading ? 'Loading…' : 'Select category…'}
                    </option>
                    {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Assign To <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select required className="form-input" value={form.assigned_to}
                    disabled={!form.location_id || locationDataLoading}
                    onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
                    style={!form.location_id ? { opacity: 0.5, cursor: 'not-allowed' } : {}}>
                    <option value="">
                      {!form.location_id ? 'Select location first…' : locationDataLoading ? 'Loading…' : 'Select inspector…'}
                    </option>
                    {filteredInspectors.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Attendee <small style={{ fontWeight: 400, color: 'var(--muted)' }}>(location side)</small></label>
                  <select className="form-input" value={form.attendee_id}
                    disabled={!form.location_id || locationDataLoading}
                    onChange={e => setForm(f => ({ ...f, attendee_id: e.target.value }))}
                    style={!form.location_id ? { opacity: 0.5, cursor: 'not-allowed' } : {}}>
                    <option value="">
                      {!form.location_id ? 'Select location first…' : locationDataLoading ? 'Loading…' : 'Select attendee…'}
                    </option>
                    {filteredAttendees.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Scheduled At <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input type="datetime-local" required className="form-input"
                  value={form.scheduled_at}
                  onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Notes <small style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</small></label>
                <textarea className="form-input form-textarea" rows={2}
                  placeholder="Any additional instructions…"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary"
                  onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setFilteredAttendees([]); setFilteredInspectors([]); setFilteredCategories([]); }}>
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
        <div
          className="modal-overlay"
          onClick={() => setSelectedEvent(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--surface)', borderRadius: 12,
              width: '100%', maxWidth: 440, maxHeight: '85vh',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              overflow: 'hidden',
            }}
          >

            {/* ── Fixed Header ── */}
            <div style={{ padding: '1.25rem 1.25rem 1rem', flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 className="modal-title" style={{ margin: 0 }}>{sel.title}</h2>
                  {sel.category_name && (
                    <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                      {sel.category_name}{sel.location_name ? ` @ ${sel.location_name}` : ''}
                    </span>
                  )}
                  {(isAssignedInspector || isAttendee) && (
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      {isAssignedInspector && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                          background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe',
                          borderRadius: 6, padding: '2px 10px', fontSize: '0.75rem', fontWeight: 600,
                        }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
                          Assigned Inspector
                        </span>
                      )}
                      {isAttendee && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                          background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0',
                          borderRadius: 6, padding: '2px 10px', fontSize: '0.75rem', fontWeight: 600,
                        }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                          Attendee
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <span style={{
                  background: STATUS_COLOR[sel.status] ?? '#6b7280', color: '#fff',
                  borderRadius: 6, padding: '3px 10px', fontSize: '0.78rem', fontWeight: 700,
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  {STATUS_LABEL[sel.status] ?? sel.status}
                </span>
              </div>
            </div>

            {/* ── Scrollable Body ── */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '1rem 1.25rem' }}>
              <div style={{ background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: '1rem' }}>
                <DetailRow label="Assigned To" value={sel.assigned_to_name || `User #${sel.assigned_to}`} />
                <DetailRow label="Attendee"    value={sel.attendee_name    || '—'} />
                <DetailRow label="Created By"  value={sel.created_by_name  || '—'} />
                <DetailRow label="Scheduled"   value={new Date(sel.scheduled_at).toLocaleString()} />
                {sel.submission_id && (
                  <DetailRow label="Submission ID" value={`#${sel.submission_id}`} />
                )}
                {sel.notes && <DetailRow label="Notes" value={sel.notes} last />}
              </div>

              {/* Submission status block */}
              {sel.status === 'completed' && submissionStatus && (
                <div style={{
                  marginBottom: '1rem', padding: '0.85rem 1rem', borderRadius: 8,
                  background: submissionStatus.status === 'approved' ? '#f0fdf4'
                            : submissionStatus.status === 'rejected' ? '#fef2f2' : '#fefce8',
                  border: `1px solid ${
                    submissionStatus.status === 'approved' ? '#86efac'
                    : submissionStatus.status === 'rejected' ? '#fca5a5' : '#fde047'
                  }`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{
                      fontWeight: 700, fontSize: '0.9rem',
                      color: submissionStatus.status === 'approved' ? '#166534'
                           : submissionStatus.status === 'rejected' ? '#991b1b' : '#854d0e',
                    }}>
                      {submissionStatus.status === 'approved' ? '✓ Approved'
                     : submissionStatus.status === 'rejected' ? '✗ Rejected'
                     : '⏳ Pending Review'}
                    </span>
                    {submissionStatus.reviewed_by_username && (
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        by {submissionStatus.reviewed_by_username}
                      </span>
                    )}
                  </div>
                  {submissionStatus.reviewed_at && (
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>
                      {new Date(submissionStatus.reviewed_at).toLocaleString()}
                    </div>
                  )}
                  {submissionStatus.review_notes && (
                    <div style={{
                      marginTop: '0.5rem', fontSize: '0.85rem', color: '#475569',
                      borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem',
                    }}>
                      {submissionStatus.review_notes}
                    </div>
                  )}
                </div>
              )}

              {sel.status === 'completed' && !submissionStatus && (
                <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                  Loading inspection result…
                </div>
              )}
            </div>
            {/* ── End Scrollable Body ── */}

            {/* ── Fixed Footer ── */}
            <div style={{
              flexShrink: 0, padding: '1rem 1.25rem',
              borderTop: '1px solid var(--border)',
              display: 'flex', flexWrap: 'wrap', gap: '0.6rem',
            }}>
              {isAttendee && !canActOnSchedule && sel.status === 'completed' && (
                <button className="btn btn-secondary" onClick={() => {
                  setSelectedEvent(null);
                  const uuid = sel.submission_uuid || localStorage.getItem(`schedule_submission_${sel.id}`);
                  if (uuid) navigate(`/submissions/${uuid}`);
                }}>
                  View Response
                </button>
              )}

              {isCoordinator && sel.status === 'completed' && (
                <button className="btn btn-secondary" onClick={() => {
                  setSelectedEvent(null);
                  const uuid = sel.submission_uuid || localStorage.getItem(`schedule_submission_${sel.id}`);
                  if (uuid) navigate(`/submissions/${uuid}`);
                }}>
                  View Response
                </button>
              )}

              {sel.status === 'pending' && canActOnSchedule && (
                isAdmin || isScheduledTimeReached ? (
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
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
                    <button className="btn btn-primary" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                      Start Inspection
                    </button>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                      Available from {new Date(sel.scheduled_at).toLocaleString()}
                    </span>
                  </div>
                )
              )}

              {sel.status === 'in_progress' && canActOnSchedule && sel.category_slug && (
                <button className="btn btn-primary" onClick={() => {
                  setSelectedEvent(null);
                  const p = new URLSearchParams();
                  if (sel.location_slug) p.set('location', sel.location_slug);
                  p.set('schedule_id', sel.id);
                  navigate(`/form/${sel.category_slug}?${p.toString()}`);
                }}>
                  Open Form
                </button>
              )}

              {sel.status === 'in_progress' && canActOnSchedule && (
                <button className="btn btn-success" onClick={() => handleStatus(sel.id, 'completed')}>
                  Mark Complete
                </button>
              )}

              {sel.status === 'completed' && canActOnSchedule && (
                <button className="btn btn-secondary" onClick={() => {
                  setSelectedEvent(null);
                  const uuid = sel.submission_uuid || localStorage.getItem(`schedule_submission_${sel.id}`);
                  if (uuid) {
                    navigate(`/submissions/${uuid}`);
                  } else if (sel.category_slug) {
                    const p = new URLSearchParams();
                    if (sel.location_slug) p.set('location', sel.location_slug);
                    p.set('schedule_id', sel.id);
                    navigate(`/form/${sel.category_slug}?${p.toString()}`);
                  }
                }}>
                  View Response
                </button>
              )}

              {/* Review & Add Remarks — attendee only, when submission is rejected and rounds remain */}
              {sel.status === 'completed' && isAttendee && role !== 'inspector' &&
               (submissionStatus?.overall_status || submissionStatus?.status) === 'rejected' &&
               (submissionRounds?.current_round ?? 1) < (submissionRounds?.max_rounds ?? 3) && (
                <button className="btn btn-primary" onClick={() => {
                  setSelectedEvent(null);
                  const uuid = sel.submission_uuid || localStorage.getItem(`schedule_submission_${sel.id}`);
                  if (uuid) navigate(`/submissions/${uuid}/review`);
                }}>
                  📝 Review &amp; Add Remarks
                </button>
              )}

              {/* Start Re-inspection — assigned inspector only, when submission is under_review */}
              {sel.status === 'completed' && isAssignedInspector && role === 'inspector' &&
               (submissionStatus?.overall_status || submissionStatus?.status) === 'under_review' && (
                <button className="btn btn-primary" onClick={() => {
                  setSelectedEvent(null);
                  const uuid = sel.submission_uuid || localStorage.getItem(`schedule_submission_${sel.id}`);
                  if (uuid) navigate(`/submissions/${uuid}/reinspect`);
                }}>
                  🔄 Start Re-inspection
                </button>
              )}

              {(canManage || isCreator) && sel.status !== 'completed' && (
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(sel.id)}>
                  Delete
                </button>
              )}

              <button className="btn btn-secondary" onClick={() => setSelectedEvent(null)} style={{ marginLeft: 'auto' }}>
                Close
              </button>
            </div>
            {/* ── End Fixed Footer ── */}

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