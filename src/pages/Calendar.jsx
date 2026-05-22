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
  notifyReviewDeadlineMissed,
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
  location_id: '', scheduled_at: '', submission_deadline: '', notes: '',
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
  const [showCompleted,        setShowCompleted]        = useState(false);
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
  const [showExtendDeadline,   setShowExtendDeadline]   = useState(false);
  const [newDeadline,          setNewDeadline]           = useState('');
  const [showReassignModal,    setShowReassignModal]    = useState(false);
  const [reassignForm,         setReassignForm]         = useState({ assigned_to: '', attendee_id: '', submission_deadline: '' });
  const [reassignLoading,      setReassignLoading]      = useState(false);
  const [reassignDataLoading,  setReassignDataLoading]  = useState(false);
  const [reassignInspectors,   setReassignInspectors]   = useState([]);
  const [reassignAttendees,    setReassignAttendees]    = useState([]);

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
    } catch (err) {
      setFilteredAttendees([]);
      setFilteredInspectors([]);
      setFilteredCategories([]);
      const status = err?.response?.status;
      if (status === 403) {
        setError('You do not have permission to load inspector/attendee data for this location. Contact your administrator.');
      } else {
        setError('Failed to load location data. Please try again.');
      }
    } finally {
      setLocationDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (
      submissionStatus?.status === 'approved' &&
      sel?.status !== 'completed'
    ) {
      updateScheduleStatus(sel.id, 'completed')
        .then(() => {
          loadSchedules();
          setSelectedEvent(prev => prev ? { ...prev, status: 'completed' } : prev);
        })
        .catch(() => setError('Failed to auto-complete schedule.'));
    }
  }, [submissionStatus]);

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
      setError(null);
      setForm(f => ({ ...f, location_id: String(userLocationId), attendee_id: '', assigned_to: '', category_id: '' }));
      loadLocationData(String(userLocationId));
    }
  }, [showForm, isLocationLocked, userLocationId, loadLocationData]);

  function handleEventClick({ event }) {
<<<<<<< HEAD
  const props = event.extendedProps;
  console.log('attendee_review_due:', props.attendee_review_due);
  console.log('full sel props:', props);
  setSelectedEvent(props);
  setSubmissionStatus(null);
  setSubmissionRounds(null);
  setShowExtendDeadline(false);
  setNewDeadline('');
=======
    const props = event.extendedProps;
    setSelectedEvent(props);
    setSubmissionStatus(null);
    setSubmissionRounds(null);
    setShowExtendDeadline(false);
    setNewDeadline('');
>>>>>>> d08762eb86d43e04069634da41ca358a2b1cbb01

    if (props.status === 'completed' || props.status === 'in_progress') {
      const uuid = props.submission_uuid
        || localStorage.getItem(`schedule_submission_${props.id}`);
      if (uuid) {
        getSubmission(uuid)
          .then(async r => {
            const sub = r.data?.submission ?? null;
            setSubmissionStatus(sub);

            // Auto-complete if submission is approved and schedule isn't completed yet
            if (sub?.status === 'approved' && props.status !== 'completed') {
              await updateScheduleStatus(props.id, 'completed');
              await loadSchedules();
              setSelectedEvent(prev => prev ? { ...prev, status: 'completed' } : prev);
            }
          })
          .catch(async (err) => {
            setSubmissionStatus(null);
            // Auto-delete schedule if its linked submission was deleted (404)
            // BEFORE
if (err?.response?.status === 404) {
  try {
    await deleteSchedule(props.id);
    setSelectedEvent(null);
    await loadSchedules();
  } catch {
    setError('Failed to delete schedule after submission was removed.');
  }
}

// AFTER
if (err?.response?.status === 404) {
  try {
    await deleteSchedule(props.id);
  } catch {
    // Schedule may already be gone (cascade delete) — ignore
  }
  setSelectedEvent(null);
  window.location.reload();
}
          });

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
        title:               form.title,
        assigned_to:         Number(form.assigned_to),
        attendee_id:         form.attendee_id         ? Number(form.attendee_id)  : null,
        category_id:         form.category_id         ? Number(form.category_id)  : null,
        location_id:         form.location_id         ? Number(form.location_id)  : null,
        scheduled_at:        form.scheduled_at,
        submission_deadline: form.submission_deadline || null,
        notes:               form.notes               || null,
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

  async function handleExtendDeadline() {
    if (!newDeadline || !sel) return;
    try {
      await updateSchedule(sel.id, { submission_deadline: newDeadline });
      setShowExtendDeadline(false);
      setNewDeadline('');
      await loadSchedules();
      setSelectedEvent(null);
    } catch {
      setError('Failed to extend deadline.');
    }
  }

  async function openReassign(schedule) {
    setShowReassignModal(true);
    setReassignForm({
      assigned_to:         String(schedule.assigned_to  ?? ''),
      attendee_id:         String(schedule.attendee_id  ?? ''),
      submission_deadline: schedule.submission_deadline
        ? schedule.submission_deadline.slice(0, 16)
        : '',
    });
    if (!schedule.location_id) return;
    setReassignDataLoading(true);
    try {
      const [attendeesRes, inspectorsRes] = await Promise.all([
        getAttendeesByLocation(schedule.location_id),
        getInspectorsByExcludingLocation(schedule.location_id),
      ]);
      setReassignInspectors(Array.isArray(inspectorsRes.data) ? inspectorsRes.data : []);
      setReassignAttendees(Array.isArray(attendeesRes.data)   ? attendeesRes.data  : []);
    } catch {
      setReassignInspectors([]);
      setReassignAttendees([]);
    } finally {
      setReassignDataLoading(false);
    }
  }

  async function handleReassign() {
    setReassignLoading(true);
    try {
      await updateSchedule(sel.id, {
        title:               sel.title,
        assigned_to:         Number(reassignForm.assigned_to),
        attendee_id:         reassignForm.attendee_id ? Number(reassignForm.attendee_id) : null,
        category_id:         sel.category_id  ?? null,
        location_id:         sel.location_id  ?? null,
        scheduled_at:        sel.scheduled_at,
        submission_deadline: reassignForm.submission_deadline || null,
        notes:               sel.notes ?? null,
      });
      setShowReassignModal(false);
      setSelectedEvent(null);
      await loadSchedules();
    } catch {
      setError('Failed to reassign schedule.');
    } finally {
      setReassignLoading(false);
    }
  }

  const sel = selectedEvent;
  const isAssignedInspector = sel && String(sel.assigned_to) === String(userId);
  const isCreator           = sel && String(sel.created_by)  === String(userId);
  const isAttendee          = sel && String(sel.attendee_id) === String(userId);
  const isCoordinator       = role === 'coordinator';
  const canActOnSchedule    = !isCoordinator && (isAdmin || isAssignedInspector || isCreator);
  const isScheduledTimeReached = sel ? Date.now() >= new Date(sel.scheduled_at).getTime() : false;
  const isDeadlinePassed       = sel?.submission_deadline
    ? Date.now() > new Date(sel.submission_deadline).getTime()
    : false;

  // Derive attendee review deadline from the most-recent rejected round
  const rejectedRound = submissionRounds?.rounds
    ? [...submissionRounds.rounds]
        .sort((a, b) => b.round_number - a.round_number)
        .find(r => r.status === 'rejected')
    : null;
<<<<<<< HEAD
  const reviewDeadline       = sel?.attendee_review_due ?? null;
 const isReviewDeadlinePassed = reviewDeadline
  ? new Date(reviewDeadline) < new Date()
  : false;
  const attendeeReviewSubmitted = rejectedRound != null && (submissionRounds?.rounds ?? []).some(
    r => r.round_number > rejectedRound.round_number);
=======
  const reviewDeadline         = rejectedRound?.review_deadline ?? rejectedRound?.attendee_review_deadline ?? null;
  const isReviewDeadlinePassed = reviewDeadline
    ? Date.now() > new Date(reviewDeadline).getTime()
    : false;
>>>>>>> d08762eb86d43e04069634da41ca358a2b1cbb01

  // Fire-and-forget: notify admins/coordinator/inspector if attendee missed their review deadline
  if (isReviewDeadlinePassed && submissionStatus?.overall_status === 'rejected') {
    const uuid = sel?.submission_uuid
      || (sel ? localStorage.getItem(`schedule_submission_${sel.id}`) : null);
    if (uuid) notifyReviewDeadlineMissed(uuid).catch(() => {});
  }

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

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {Object.entries(STATUS_LABEL).map(([key, label]) => (
          <span key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 500 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLOR[key], display: 'inline-block', flexShrink: 0 }} />
            {label}
          </span>
        ))}
        <button
          className={`btn btn-sm ${showCompleted ? 'btn-primary' : 'btn-secondary'}`}
          style={{ marginLeft: 'auto' }}
          onClick={() => setShowCompleted(v => !v)}
        >
          {showCompleted ? 'Hide Completed' : 'Show Completed'}
        </button>
      </div>

      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)', padding: '1.25rem' }}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
          events={showCompleted ? events : events.filter(e => e.extendedProps?.status !== 'completed')}
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
              <div className="form-row">
                <div className="form-group">
                  <label>Scheduled At <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="datetime-local" required className="form-input"
                    value={form.scheduled_at}
                    onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Submit By <small style={{ fontWeight: 400, color: 'var(--muted)' }}>(deadline)</small></label>
                  <input type="datetime-local" className="form-input"
                    value={form.submission_deadline}
                    min={form.scheduled_at || undefined}
                    onChange={e => setForm(f => ({ ...f, submission_deadline: e.target.value }))} />
                </div>
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

<<<<<<< HEAD
      {/* ── Reassign Schedule Modal ── */}
      {showReassignModal && sel && canManage && (
        <div className="modal-overlay" onClick={() => setShowReassignModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <h2 className="modal-title">Reassign Schedule</h2>
            <p className="modal-message" style={{ marginBottom: '1.25rem' }}>
              Update the inspector, attendee, or submission deadline. All other fields are locked.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Title</label>
                <input type="text" className="form-input" value={sel.title} readOnly
                  style={{ background: 'var(--input-disabled, #f3f4f6)', cursor: 'not-allowed' }} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Location</label>
                  <input className="form-input" value={sel.location_name ?? ''} readOnly
                    style={{ background: 'var(--input-disabled, #f3f4f6)', cursor: 'not-allowed' }} />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <input className="form-input" value={sel.category_name ?? ''} readOnly
                    style={{ background: 'var(--input-disabled, #f3f4f6)', cursor: 'not-allowed' }} />
=======
      {/* ── Event Detail Modal ── */}
      {sel && (
        <div
          className="modal-overlay"
          onClick={() => { setSelectedEvent(null); setReassigning(false); }}
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
>>>>>>> d08762eb86d43e04069634da41ca358a2b1cbb01
                </div>
              </div>
<<<<<<< HEAD
              <div className="form-row">
                <div className="form-group">
                  <label>Assign To <span style={{ color: 'var(--danger)' }}>*</span></label>
                  {reassignDataLoading ? (
                    <input className="form-input" value="Loading…" readOnly />
                  ) : (
                    <select className="form-input" value={reassignForm.assigned_to}
                      onChange={e => setReassignForm(f => ({ ...f, assigned_to: e.target.value }))}>
                      <option value="">Select inspector…</option>
                      {reassignInspectors.map(u => (
                        <option key={u.id} value={u.id}>{u.username}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="form-group">
                  <label>Attendee <small style={{ fontWeight: 400, color: 'var(--muted)' }}>(location side)</small></label>
                  {reassignDataLoading ? (
                    <input className="form-input" value="Loading…" readOnly />
                  ) : (
                    <select className="form-input" value={reassignForm.attendee_id}
                      onChange={e => setReassignForm(f => ({ ...f, attendee_id: e.target.value }))}>
                      <option value="">None</option>
                      {reassignAttendees.map(u => (
                        <option key={u.id} value={u.id}>{u.username}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Scheduled At</label>
                  <input type="text" className="form-input"
                    value={new Date(sel.scheduled_at).toLocaleString()} readOnly
                    style={{ background: 'var(--input-disabled, #f3f4f6)', cursor: 'not-allowed' }} />
                </div>
                <div className="form-group">
                  <label>Submit By <small style={{ fontWeight: 400, color: 'var(--muted)' }}>(deadline)</small></label>
                  <input type="datetime-local" className="form-input"
                    value={reassignForm.submission_deadline}
                    onChange={e => setReassignForm(f => ({ ...f, submission_deadline: e.target.value }))} />
                </div>
              </div>
              {sel.notes && (
                <div className="form-group">
                  <label>Notes</label>
                  <textarea className="form-input form-textarea" rows={2} value={sel.notes ?? ''} readOnly
                    style={{ background: 'var(--input-disabled, #f3f4f6)', cursor: 'not-allowed' }} />
=======
            </div>

            {/* ── Scrollable Body ── */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '1rem 1.25rem' }}>
              <div style={{ background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: '1rem' }}>
                <DetailRow label="Assigned To" value={sel.assigned_to_name || `User #${sel.assigned_to}`} />
                <DetailRow label="Attendee"    value={sel.attendee_name    || '–'} />
                <DetailRow label="Created By"  value={sel.created_by_name  || '–'} />
                <DetailRow label="Scheduled"   value={new Date(sel.scheduled_at).toLocaleString()} />
                {sel.submission_deadline && (
                  <DetailRow
                    label="Submit By"
                    value={
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {new Date(sel.submission_deadline).toLocaleString()}
                        {isDeadlinePassed && sel.status !== 'completed' && (
                          <span style={{
                            fontSize: '0.7rem', fontWeight: 700, color: '#dc2626',
                            background: '#fef2f2', border: '1px solid #fca5a5',
                            borderRadius: 4, padding: '1px 6px',
                          }}>
                            Deadline passed
                          </span>
                        )}
                      </span>
                    }
                  />
                )}
                {sel.submission_id && (
                  <DetailRow label="Submission ID" value={`#${sel.submission_id}`} />
                )}
                {sel.notes && <DetailRow label="Notes" value={sel.notes} last />}
              </div>

              {/* ── Reassign Panel ── */}
              {reassigning && (
                <div style={{
                  background: 'var(--bg)', borderRadius: 8,
                  border: '1px solid #bfdbfe', padding: '1rem',
                  marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem',
                }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>
                    Reassign Inspector &amp; Attendee
                  </p>
                  {reassignDataLoading ? (
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>Loading users…</p>
                  ) : (
                    <>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Inspector <span style={{ color: 'var(--danger)' }}>*</span>
                        </label>
                        <select
                          className="form-input"
                          value={reassignForm.assigned_to}
                          onChange={e => setReassignForm(f => ({ ...f, assigned_to: e.target.value }))}
                        >
                          <option value="">Select inspector…</option>
                          {reassignInspectors.map(u => (
                            <option key={u.id} value={u.id}>{u.username}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Attendee
                        </label>
                        <select
                          className="form-input"
                          value={reassignForm.attendee_id}
                          onChange={e => setReassignForm(f => ({ ...f, attendee_id: e.target.value }))}
                        >
                          <option value="">None</option>
                          {reassignAttendees.map(u => (
                            <option key={u.id} value={u.id}>{u.username}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setReassigning(false)}>
                          Cancel
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={!reassignForm.assigned_to || reassignLoading}
                          onClick={handleReassign}
                        >
                          {reassignLoading ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

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
>>>>>>> d08762eb86d43e04069634da41ca358a2b1cbb01
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary"
                  onClick={() => setShowReassignModal(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary"
                  disabled={!reassignForm.assigned_to || reassignLoading}
                  onClick={handleReassign}>
                  {reassignLoading ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
<<<<<<< HEAD
=======
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
                  if (uuid) navigate(`/submissions/${uuid}`, { state: { scheduleTitle: sel.title } });
                }}>
                  View Response
                </button>
              )}

              {isCoordinator && sel.status === 'completed' && (
                <button className="btn btn-secondary" onClick={() => {
                  setSelectedEvent(null);
                  const uuid = sel.submission_uuid || localStorage.getItem(`schedule_submission_${sel.id}`);
                  if (uuid) navigate(`/submissions/${uuid}`, { state: { scheduleTitle: sel.title } });
                }}>
                  View Response
                </button>
              )}

              {isCoordinator && (sel.status === 'pending' || sel.status === 'in_progress') && sel.submission_deadline && (
                showExtendDeadline ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)' }}>New submission deadline</label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={newDeadline}
                      min={new Date().toISOString().slice(0, 16)}
                      onChange={e => setNewDeadline(e.target.value)}
                      style={{ fontSize: '0.875rem' }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-primary" style={{ flex: 1 }}
                        disabled={!newDeadline}
                        onClick={handleExtendDeadline}>
                        Save
                      </button>
                      <button className="btn btn-secondary"
                        onClick={() => { setShowExtendDeadline(false); setNewDeadline(''); }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button className="btn btn-secondary" onClick={() => {
                    setNewDeadline(sel.submission_deadline.slice(0, 16));
                    setShowExtendDeadline(true);
                  }}>
                    {isDeadlinePassed ? 'Extend Deadline' : 'Change Deadline'}
                  </button>
                )
              )}

              {sel.status === 'pending' && canActOnSchedule && (
                isAdmin || (isScheduledTimeReached && !isDeadlinePassed) ? (
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
                ) : isDeadlinePassed ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
                    <button className="btn btn-primary" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                      Start Inspection
                    </button>
                    <span style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>
                      Submission deadline passed ({new Date(sel.submission_deadline).toLocaleString()})
                    </span>
                  </div>
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

              {sel.status === 'in_progress' && canActOnSchedule && sel.category_slug && !submissionStatus && (
                isAdmin || !isDeadlinePassed ? (
                  <button className="btn btn-primary" onClick={() => {
                    setSelectedEvent(null);
                    const p = new URLSearchParams();
                    if (sel.location_slug) p.set('location', sel.location_slug);
                    p.set('schedule_id', sel.id);
                    navigate(`/form/${sel.category_slug}?${p.toString()}`);
                  }}>
                    Open Form
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
                    <button className="btn btn-primary" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                      Open Form
                    </button>
                    <span style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>
                      Submission deadline passed ({new Date(sel.submission_deadline).toLocaleString()})
                    </span>
                  </div>
                )
              )}

              {sel.status === 'in_progress' && isAdmin && (
                <button className="btn btn-success" onClick={() => handleStatus(sel.id, 'completed')}>
                  Mark Complete
                </button>
              )}

              {(sel.status === 'completed' || (sel.status === 'in_progress' && submissionStatus)) && canActOnSchedule && (
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

              {/* Review & Add Remarks – attendee only, when submission is rejected */}
              {(sel.status === 'completed' || sel.status === 'in_progress') && isAttendee &&
               (submissionStatus?.overall_status || submissionStatus?.status) === 'rejected' && (
                isReviewDeadlinePassed ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
                    <button className="btn btn-primary" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                      📝 Review &amp; Add Remarks
                    </button>
                    <span style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>
                      Review deadline passed ({new Date(reviewDeadline).toLocaleString()})
                    </span>
                  </div>
                ) : (
                  <button className="btn btn-primary" onClick={() => {
                    setSelectedEvent(null);
                    const uuid = sel.submission_uuid || localStorage.getItem(`schedule_submission_${sel.id}`);
                    if (uuid) navigate(`/submissions/${uuid}/review`);
                  }}>
                    📝 Review &amp; Add Remarks
                    {reviewDeadline && (
                      <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 400, opacity: 0.85 }}>
                        Due by {new Date(reviewDeadline).toLocaleString()}
                      </span>
                    )}
                  </button>
                )
              )}

              {/* Start Re-inspection – assigned inspector or admin, when submission is under_review */}
              {(sel.status === 'completed' || sel.status === 'in_progress') &&
               (isAdmin || (isAssignedInspector && role === 'inspector')) &&
               (submissionStatus?.overall_status || submissionStatus?.status) === 'under_review' && (
                <button className="btn btn-primary" onClick={() => {
                  setSelectedEvent(null);
                  const uuid = sel.submission_uuid || localStorage.getItem(`schedule_submission_${sel.id}`);
                  if (uuid) navigate(`/submissions/${uuid}/reinspect`, { state: { scheduleId: sel.id } });
                }}>
                  🔄 Start Re-inspection
                </button>
              )}

              {canManage && sel.status !== 'completed' && !reassigning && (
                <button className="btn btn-secondary btn-sm" onClick={() => openReassign(sel)}>
                  Reassign
                </button>
              )}

              {(isAdmin || ((canManage || isCreator) && sel.status !== 'completed')) && (
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(sel.id)}>
                  Delete
                </button>
              )}

              <button className="btn btn-secondary" onClick={() => { setSelectedEvent(null); setReassigning(false); }} style={{ marginLeft: 'auto' }}>
                Close
              </button>
            </div>
            {/* ── End Fixed Footer ── */}

>>>>>>> d08762eb86d43e04069634da41ca358a2b1cbb01
          </div>
        </div>
      )}

      {/* ── Event Detail Modal ── */}
{sel && !showReassignModal && (
  <div
    className="modal-overlay"
    onClick={() => { setSelectedEvent(null); setShowReassignModal(false); }}
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

          {/* ── INSPECTOR: sees submission_deadline as "Submit By" ── */}
          {isAssignedInspector && !isAttendee && sel.submission_deadline && (
            <DetailRow
              label="Submit By"
              value={
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{
                    color: isDeadlinePassed ? '#dc2626' : 'var(--text)',
                    fontWeight: isDeadlinePassed ? 600 : 500,
                  }}>
                    {new Date(sel.submission_deadline).toLocaleString()}
                  </span>
                  {submissionStatus && ['submitted','approved','rejected','under_review'].includes(
                    submissionStatus.overall_status ?? submissionStatus.status
                  ) ? (
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 700, color: '#166534',
                      background: '#f0fdf4', border: '1px solid #86efac',
                      borderRadius: 4, padding: '1px 6px',
                    }}>
                      Submitted
                    </span>
                  ) : isDeadlinePassed && sel.status !== 'completed' ? (
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 700, color: '#dc2626',
                      background: '#fef2f2', border: '1px solid #fca5a5',
                      borderRadius: 4, padding: '1px 6px',
                    }}>
                      Deadline passed
                    </span>
                  ) : null}
                </span>
              }
            />
          )}

          {/* ── ATTENDEE: sees attendee_review_due as "Submit By" ── */}
          {isAttendee && !isAssignedInspector && (
            sel.attendee_review_due ? (
              <DetailRow
                label="Submit By"
                value={
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{
                      color: isReviewDeadlinePassed ? '#dc2626' : '#7e22ce',
                      fontWeight: 600,
                    }}>
                      {new Date(sel.attendee_review_due).toLocaleString()}
                    </span>
                    {attendeeReviewSubmitted ? (
                      <span style={{
                        fontSize: '0.7rem', fontWeight: 700, color: '#166534',
                        background: '#f0fdf4', border: '1px solid #86efac',
                        borderRadius: 4, padding: '1px 6px',
                      }}>
                        Submitted
                      </span>
                    ) : isReviewDeadlinePassed ? (
                      <span style={{
                        fontSize: '0.7rem', fontWeight: 700, color: '#dc2626',
                        background: '#fef2f2', border: '1px solid #fca5a5',
                        borderRadius: 4, padding: '1px 6px',
                      }}>
                        Deadline passed
                      </span>
                    ) : null}
                  </span>
                }
              />
            ) : (
              // Rejected but inspector hasn't set a deadline yet
              (submissionStatus?.overall_status ?? submissionStatus?.status) === 'rejected' && (
                <DetailRow
                  label="Submit By"
                  value={
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                      Not set by inspector yet
                    </span>
                  }
                />
              )
            )
          )}

          {/* ── ADMIN: sees both deadlines separately ── */}
          {isAdmin && (
            <>
              {sel.submission_deadline && (
                <DetailRow
                  label="Inspector Deadline"
                  value={
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {new Date(sel.submission_deadline).toLocaleString()}
                      {isDeadlinePassed && sel.status !== 'completed' && (
                        <span style={{
                          fontSize: '0.7rem', fontWeight: 700, color: '#dc2626',
                          background: '#fef2f2', border: '1px solid #fca5a5',
                          borderRadius: 4, padding: '1px 6px',
                        }}>
                          Passed
                        </span>
                      )}
                    </span>
                  }
                />
              )}
              {sel.attendee_review_due && (
                <DetailRow
                  label="Attendee Review Due"
                  value={
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ color: '#7e22ce', fontWeight: 500 }}>
                        {new Date(sel.attendee_review_due).toLocaleString()}
                      </span>
                      {attendeeReviewSubmitted ? (
                        <span style={{
                          fontSize: '0.7rem', fontWeight: 700, color: '#166534',
                          background: '#f0fdf4', border: '1px solid #86efac',
                          borderRadius: 4, padding: '1px 6px',
                        }}>
                          Submitted
                        </span>
                      ) : isReviewDeadlinePassed ? (
                        <span style={{
                          fontSize: '0.7rem', fontWeight: 700, color: '#dc2626',
                          background: '#fef2f2', border: '1px solid #fca5a5',
                          borderRadius: 4, padding: '1px 6px',
                        }}>
                          Passed
                        </span>
                      ) : null}
                    </span>
                  }
                />
              )}
            </>
          )}

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
            if (uuid) navigate(`/submissions/${uuid}`, { state: { scheduleTitle: sel.title } });
          }}>
            View Response
          </button>
        )}

        {isCoordinator && sel.status === 'completed' && (
          <button className="btn btn-secondary" onClick={() => {
            setSelectedEvent(null);
            const uuid = sel.submission_uuid || localStorage.getItem(`schedule_submission_${sel.id}`);
            if (uuid) navigate(`/submissions/${uuid}`, { state: { scheduleTitle: sel.title } });
          }}>
            View Response
          </button>
        )}

        {isCoordinator && (sel.status === 'pending' || sel.status === 'in_progress') && sel.submission_deadline && (
          showExtendDeadline ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)' }}>New submission deadline</label>
              <input
                type="datetime-local" className="form-input"
                value={newDeadline}
                min={new Date().toISOString().slice(0, 16)}
                onChange={e => setNewDeadline(e.target.value)}
                style={{ fontSize: '0.875rem' }}
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-primary" style={{ flex: 1 }}
                  disabled={!newDeadline} onClick={handleExtendDeadline}>
                  Save
                </button>
                <button className="btn btn-secondary"
                  onClick={() => { setShowExtendDeadline(false); setNewDeadline(''); }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button className="btn btn-secondary" onClick={() => {
              setNewDeadline(sel.submission_deadline.slice(0, 16));
              setShowExtendDeadline(true);
            }}>
              {isDeadlinePassed ? 'Extend Deadline' : 'Change Deadline'}
            </button>
          )
        )}

        {sel.status === 'pending' && canActOnSchedule && (
          isAdmin || (isScheduledTimeReached && !isDeadlinePassed) ? (
            <button className="btn btn-primary" onClick={async () => {
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
              } catch { setError('Failed to start inspection.'); }
            }}>
              Start Inspection
            </button>
          ) : isDeadlinePassed ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
              <button className="btn btn-primary" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                Start Inspection
              </button>
              <span style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>
                Submission deadline passed ({new Date(sel.submission_deadline).toLocaleString()})
              </span>
            </div>
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

        {sel.status === 'in_progress' && canActOnSchedule && sel.category_slug && !submissionStatus && (
          isAdmin || !isDeadlinePassed ? (
            <button className="btn btn-primary" onClick={() => {
              setSelectedEvent(null);
              const p = new URLSearchParams();
              if (sel.location_slug) p.set('location', sel.location_slug);
              p.set('schedule_id', sel.id);
              navigate(`/form/${sel.category_slug}?${p.toString()}`);
            }}>
              Open Form
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
              <button className="btn btn-primary" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                Open Form
              </button>
              <span style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>
                Submission deadline passed ({new Date(sel.submission_deadline).toLocaleString()})
              </span>
            </div>
          )
        )}

        {sel.status === 'in_progress' && isAdmin && (
          <button className="btn btn-success" onClick={() => handleStatus(sel.id, 'completed')}>
            Mark Complete
          </button>
        )}

        {(sel.status === 'completed' || (sel.status === 'in_progress' && submissionStatus)) && canActOnSchedule && (
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

        {/* Review & Add Remarks — attendee only, when submission is rejected */}
        {(sel.status === 'completed' || sel.status === 'in_progress') && isAttendee &&
         (submissionStatus?.overall_status || submissionStatus?.status) === 'rejected' && (
          attendeeReviewSubmitted ? (
            <button className="btn btn-secondary" disabled style={{ opacity: 0.7, cursor: 'not-allowed' }}>
              Review Submitted
            </button>
          ) : isReviewDeadlinePassed ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
              <button className="btn btn-primary" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                📝 Review &amp; Add Remarks
              </button>
              <span style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>
                Review deadline passed ({reviewDeadline ? new Date(reviewDeadline).toLocaleString() : '—'})
              </span>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={() => {
              setSelectedEvent(null);
              const uuid = sel.submission_uuid || localStorage.getItem(`schedule_submission_${sel.id}`);
              if (uuid) navigate(`/submissions/${uuid}/review`);
            }}>
              📝 Review &amp; Add Remarks
              {reviewDeadline && (
                <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 400, opacity: 0.85 }}>
                  Due by {new Date(reviewDeadline).toLocaleString()}
                </span>
              )}
            </button>
          )
        )}

        {/* Start Re-inspection — assigned inspector or admin, when submission is under_review */}
        {(sel.status === 'completed' || sel.status === 'in_progress') &&
         (isAdmin || (isAssignedInspector && role === 'inspector')) &&
         (submissionStatus?.overall_status || submissionStatus?.status) === 'under_review' && (
          <button className="btn btn-primary" onClick={() => {
            setSelectedEvent(null);
            const uuid = sel.submission_uuid || localStorage.getItem(`schedule_submission_${sel.id}`);
            if (uuid) navigate(`/submissions/${uuid}/reinspect`);
          }}>
            🔄 Start Re-inspection
          </button>
        )}

        {canManage && sel.status !== 'completed' && (
          <button className="btn btn-secondary btn-sm" onClick={() => openReassign(sel)}>
            Reassign
          </button>
        )}

        {(isAdmin || ((canManage || isCreator) && sel.status !== 'completed')) && (
          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(sel.id)}>
            Delete
          </button>
        )}

        <button className="btn btn-secondary"
          onClick={() => { setSelectedEvent(null); setShowReassignModal(false); }}
          style={{ marginLeft: 'auto' }}>
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