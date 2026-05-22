import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { getUsers, register, deleteUser, getRolesWithPerms, getLocations } from '../../api/api';
import ConfirmModal from '../../components/ConfirmModal';
import { useAuth } from '../../context/AuthContext';

const REQUIRED_COLS = ['username', 'email', 'password', 'location', 'role'];

const COL_ALIASES = {
  username: ['username', 'user name', 'user', 'name', 'login'],
  email:    ['email', 'e-mail', 'email address', 'emailaddress', 'mail'],
  password: ['password', 'pass', 'pwd', 'passwd'],
  location: ['location', 'loc', 'city', 'place', 'branch', 'site'],
  role:     ['role', 'roles', 'user role', 'userrole', 'type'],
};

function resolveField(headerCell) {
  const h = headerCell.toLowerCase().trim();
  for (const [field, aliases] of Object.entries(COL_ALIASES)) {
    if (aliases.some(a => h === a || h.includes(a))) return field;
  }
  return h;
}

function validateRow(row) {
  return REQUIRED_COLS.filter(c => !String(row[c] ?? '').trim());
}

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([['username', 'email', 'password', 'location', 'role']]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Users');
  XLSX.writeFile(wb, 'users_template.xlsx');
}

export default function Users() {
  const { user: currentUser } = useAuth();
  const isLocalAdmin = currentUser?.role === 'local_admin';

  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    username: '', email: '', password: '', confirm: '',
    location: isLocalAdmin ? (currentUser?.location ?? '') : '',
    role: '',
  });

  const [roles, setRoles]             = useState([]);
  const [locations, setLocations]     = useState([]);
  const [formError, setFormError]     = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [deletingId, setDeletingId]   = useState(null);
  const [confirmUser, setConfirmUser] = useState(null);

  const fileInputRef                    = useRef(null);
  const [preview, setPreview]           = useState(null);
  const [bulkProgress, setBulkProgress] = useState(null);
  const [bulkRunning, setBulkRunning]   = useState(false);

  useEffect(() => {
    fetchUsers();
    getRolesWithPerms().then(res => setRoles(Array.isArray(res.data) ? res.data : [])).catch(() => {});
    getLocations().then(res => setLocations(Array.isArray(res.data) ? res.data : [])).catch(() => {});
  }, []);

  async function fetchUsers() {
    try {
      const res = await getUsers();
      const allUsers = Array.isArray(res.data) ? res.data : [];
      setUsers(isLocalAdmin ? allUsers.filter(u => u.location === currentUser?.location) : allUsers);
    } catch { setUsers([]); } finally { setLoading(false); }
  }

  async function confirmDelete() {
    const user = confirmUser;
    setConfirmUser(null);
    const id = user.id || user._id;
    setDeletingId(id);
    try {
      await deleteUser(id);
      setUsers(prev => prev.filter(u => (u.id || u._id) !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user.');
    } finally { setDeletingId(null); }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(''); setFormSuccess('');
    if (form.password !== form.confirm) { setFormError('Passwords do not match.'); return; }
    const locationToSubmit = isLocalAdmin ? (currentUser?.location ?? '') : form.location;
    setSubmitting(true);
    try {
      await register(form.username, form.email, form.password, locationToSubmit, form.role);
      setFormSuccess(`User "${form.username}" created successfully.`);
      setForm({ username: '', email: '', password: '', confirm: '', location: isLocalAdmin ? (currentUser?.location ?? '') : '', role: '' });
      setShowForm(false);
      fetchUsers();
    } catch (err) {
      setFormError(err.response?.data?.error || err.response?.data?.message || 'Registration failed. Please try again.');
    } finally { setSubmitting(false); }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onerror = () => { setPreview({ rows: [], fileName: file.name, parseError: 'Could not read the file.' }); setBulkProgress(null); };
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(new Uint8Array(ev.target.result), { type: 'array' });
        if (!wb.SheetNames.length) { setPreview({ rows: [], fileName: file.name, parseError: 'No sheets found.' }); return; }
        const ws = wb.Sheets[wb.SheetNames[0]];
        const allRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        const headerIdx = allRows.findIndex(row => row.some(cell => String(cell).trim() !== ''));
        if (headerIdx === -1) { setPreview({ rows: [], fileName: file.name, parseError: 'Sheet is empty.' }); return; }
        const colMap = allRows[headerIdx].map(h => resolveField(String(h)));
        const dataRows = allRows.slice(headerIdx + 1).filter(row => row.some(cell => String(cell).trim() !== ''));
        const rows = dataRows.map(row => {
          const norm = {};
          colMap.forEach((field, idx) => { norm[field] = String(row[idx] ?? '').trim(); });
          norm._errors = validateRow(norm);
          return norm;
        });
        const detectedFields = new Set(colMap);
        const missingCols = REQUIRED_COLS.filter(c => !detectedFields.has(c));
        let locationError = null;
        if (isLocalAdmin) {
          const adminLoc = (currentUser?.location ?? '').trim().toLowerCase();
          const mismatch = rows.find(r => r.location.trim().toLowerCase() !== adminLoc);
          if (mismatch) locationError = `All rows must have location "${currentUser?.location}". Found "${mismatch.location}".`;
        }
        setPreview({ rows, fileName: file.name, missingCols, locationError });
        setBulkProgress(null);
      } catch (err) {
        setPreview({ rows: [], fileName: file.name, parseError: `Parse error: ${err.message}` });
        setBulkProgress(null);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleBulkCreate() {
    if (!preview) return;
    const validRows = preview.rows.filter(r => r._errors.length === 0);
    if (validRows.length === 0) return;
    setBulkRunning(true);
    setBulkProgress({ done: 0, total: validRows.length, results: [] });
    const results = [];
    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        await register(row.username, row.email, row.password, row.location, row.role);
        results.push({ ok: true, username: row.username });
      } catch (err) {
        results.push({ ok: false, username: row.username, msg: err.response?.data?.error || err.response?.data?.message || 'Failed' });
      }
      setBulkProgress({ done: i + 1, total: validRows.length, results: [...results] });
    }
    setBulkRunning(false);
    fetchUsers();
  }

  function clearBulk() { setPreview(null); setBulkProgress(null); }

  const validCount   = preview ? preview.rows.filter(r => r._errors.length === 0).length : 0;
  const invalidCount = preview ? preview.rows.length - validCount : 0;

  return (
    <div>
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv"
        style={{ display: 'none' }} onChange={handleFileChange} />

      <div className="sticky-top bg-white border-bottom py-2 mb-3">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-1">
            <li className="breadcrumb-item active">Users Admin</li>
          </ol>
        </nav>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-0">
          <h1 className="h4 fw-bold mb-0">
            Manage Users
            {isLocalAdmin && currentUser?.location && (
              <span className="badge bg-primary-subtle text-primary ms-2 fw-normal small">
                {currentUser.location}
              </span>
            )}
          </h1>
          {!showForm && !preview && (
            <div className="d-flex gap-2">
              <button className="btn btn-secondary btn-sm" onClick={downloadTemplate}>Download Template</button>
              <button className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current.click()}>Upload Excel</button>
              <button className="btn btn-primary btn-sm" onClick={() => { setFormError(''); setShowForm(true); }}>
                + Add User
              </button>
            </div>
          )}
        </div>
      </div>

      {formSuccess && <div className="alert alert-success py-2">{formSuccess}</div>}

      {/* Single-user form */}
      {showForm && (
        <form className="card card-body mb-4" onSubmit={handleSubmit}>
          <h2 className="h5 fw-bold mb-3">New User</h2>
          {formError && <div className="alert alert-danger py-2">{formError}</div>}

          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label fw-semibold">Username <span className="text-danger">*</span></label>
              <input name="username" className="form-control" value={form.username}
                onChange={handleChange} required autoFocus />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold">Email <span className="text-danger">*</span></label>
              <input name="email" type="email" className="form-control" value={form.email}
                onChange={handleChange} required />
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label fw-semibold">Location <span className="text-danger">*</span></label>
              {isLocalAdmin ? (
                <input className="form-control" value={currentUser?.location ?? ''} readOnly
                  style={{ background: '#f3f4f6', cursor: 'not-allowed' }} />
              ) : (
                <select name="location" className="form-select" value={form.location}
                  onChange={handleChange} required>
                  <option value="">Select a location…</option>
                  {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                </select>
              )}
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold">Role <span className="text-danger">*</span></label>
              <select name="role" className="form-select" value={form.role} onChange={handleChange} required>
                <option value="">Select a role…</option>
                {roles
                  .filter(r => r.role !== 'global_admin' && !(isLocalAdmin && r.role === 'local_admin'))
                  .map(r => <option key={r.role} value={r.role}>{r.role}</option>)}
              </select>
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label fw-semibold">Password <span className="text-danger">*</span></label>
              <input name="password" type="password" className="form-control" value={form.password}
                onChange={handleChange} required />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold">Confirm Password <span className="text-danger">*</span></label>
              <input name="confirm" type="password" className="form-control" value={form.confirm}
                onChange={handleChange} required />
            </div>
          </div>

          <div className="d-flex gap-3 mt-2">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create User'}
            </button>
            <button type="button" className="btn btn-secondary"
              onClick={() => { setShowForm(false); setFormError(''); }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Bulk upload preview */}
      {preview && (
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div>
              <strong>{preview.fileName}</strong>
              <span className="text-muted small ms-3">
                {preview.rows.length} row{preview.rows.length !== 1 ? 's' : ''} parsed
                {invalidCount > 0 && <span className="text-danger ms-2">· {invalidCount} invalid (will be skipped)</span>}
              </span>
              {isLocalAdmin && (
                <span className="text-primary small ms-3">
                  Location locked to: <strong>{currentUser?.location}</strong>
                </span>
              )}
            </div>
            {!bulkRunning && (
              <button className="btn btn-secondary btn-sm" onClick={clearBulk}>Clear</button>
            )}
          </div>

          {preview.parseError    && <div className="alert alert-danger py-2">{preview.parseError}</div>}
          {preview.locationError && <div className="alert alert-danger py-2">{preview.locationError}</div>}
          {preview.missingCols?.length > 0 && (
            <div className="alert alert-danger py-2">
              Column{preview.missingCols.length > 1 ? 's' : ''} not found:{' '}
              <strong>{preview.missingCols.join(', ')}</strong>.
            </div>
          )}

          {!preview.locationError && (
            <div className="table-responsive mb-3">
              <table className="table table-bordered table-hover table-sm">
                <thead className="table-light">
                  <tr><th>#</th><th>Username</th><th>Email</th><th>Location</th><th>Role</th><th>Password</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, i) => {
                    const result = bulkProgress?.results.find(r => r.username === row.username && preview.rows.indexOf(row) === i);
                    const isInvalid = row._errors.length > 0;
                    return (
                      <tr key={i} style={{ opacity: isInvalid ? 0.55 : 1, background: result ? (result.ok ? '#f0fdf4' : '#fef2f2') : undefined }}>
                        <td>{i + 1}</td>
                        <td data-label="Username">{row.username || <em className="text-danger">missing</em>}</td>
                        <td data-label="Email">{row.email || <em className="text-danger">missing</em>}</td>
                        <td data-label="Location">
                          {isLocalAdmin
                            ? <span className="text-primary">{currentUser?.location}</span>
                            : row.location || <em className="text-danger">missing</em>}
                        </td>
                        <td data-label="Role">{row.role || <em className="text-danger">missing</em>}</td>
                        <td data-label="Password">{row.password ? '••••••' : <em className="text-danger">missing</em>}</td>
                        <td data-label="Status">
                          {result ? (
                            result.ok
                              ? <span className="text-success fw-semibold">Created</span>
                              : <span className="text-danger" title={result.msg}>Failed</span>
                          ) : isInvalid ? (
                            <span className="text-warning">Missing: {row._errors.join(', ')}</span>
                          ) : (
                            <span className="text-muted">Ready</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!preview.locationError && !bulkProgress && (
            <button className="btn btn-primary"
              disabled={validCount === 0 || !!preview.locationError}
              onClick={handleBulkCreate}>
              Create {validCount} User{validCount !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}

      {/* Users table */}
      {!showForm && !preview && (
        loading ? <p>Loading users…</p> : (
          <div className="table-responsive">
            <table className="table table-bordered table-hover table-sm">
              <thead className="table-light">
                <tr><th>Username</th><th>Email</th><th>Role</th><th>Location</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={5} className="text-center text-muted">No users found.</td></tr>
                ) : (
                  users.map(u => {
                    const uid = u.id || u._id;
                    return (
                      <tr key={uid || u.username} style={{ opacity: deletingId === uid ? 0.4 : 1 }}>
                        <td data-label="Username">{u.username}</td>
                        <td data-label="Email">{u.email}</td>
                        <td data-label="Role">{u.role || '—'}</td>
                        <td data-label="Location">{u.location || u.city || '—'}</td>
                        <td data-label="Actions" className="d-flex gap-1">
                          <button className="btn btn-sm btn-danger"
                            onClick={() => setConfirmUser(u)} disabled={deletingId === uid}>
                            {deletingId === uid ? 'Deleting…' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )
      )}

      {confirmUser && (
        <ConfirmModal
          title="Delete user"
          message={`Delete "${confirmUser.username}"? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={confirmDelete}
          onCancel={() => setConfirmUser(null)}
        />
      )}
    </div>
  );
}

