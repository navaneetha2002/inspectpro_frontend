import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { getUsers, register, deleteUser, getRolesWithPerms, getLocations } from '../../api/api';
import ConfirmModal from '../../components/ConfirmModal';

const REQUIRED_COLS = ['username', 'email', 'password', 'location', 'role'];

// Aliases allow any reasonable column header the user might type
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
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Single-user form
  const [form, setForm]             = useState({ username: '', email: '', password: '', confirm: '', location: '', role: '' });
  const [roles, setRoles]           = useState([]);
  const [locations, setLocations]   = useState([]);
  const [formError, setFormError]   = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [deletingId,  setDeletingId]  = useState(null);
  const [confirmUser, setConfirmUser] = useState(null);

  // Bulk upload
  const fileInputRef                    = useRef(null);
  const [preview, setPreview]           = useState(null);
  const [bulkProgress, setBulkProgress] = useState(null);
  const [bulkRunning, setBulkRunning]   = useState(false);

  useEffect(() => {
    fetchUsers();
    getRolesWithPerms().then(res => setRoles(res.data)).catch(() => {});
    getLocations().then(res => setLocations(Array.isArray(res.data) ? res.data : [])).catch(() => {});
  }, []);

  async function fetchUsers() {
    try {
      const res = await getUsers();
      setUsers(res.data);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
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
    } finally {
      setDeletingId(null);
    }
  }

  // ── Single user ──────────────────────────────────────────────
  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    if (form.password !== form.confirm) {
      setFormError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await register(form.username, form.email, form.password, form.location, form.role);
      setFormSuccess(`User "${form.username}" created successfully.`);
      setForm({ username: '', email: '', password: '', confirm: '', location: '', role: '' });
      setShowForm(false);
      fetchUsers();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Bulk upload ───────────────────────────────────────────────
  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const reader = new FileReader();

    reader.onerror = () => {
      setPreview({ rows: [], fileName: file.name, parseError: 'Could not read the file from disk.' });
      setBulkProgress(null);
    };

    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(new Uint8Array(ev.target.result), { type: 'array' });

        if (!wb.SheetNames.length) {
          setPreview({ rows: [], fileName: file.name, parseError: 'No sheets found in this file.' });
          setBulkProgress(null);
          return;
        }

        const ws = wb.Sheets[wb.SheetNames[0]];
        const allRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        const headerIdx = allRows.findIndex(row => row.some(cell => String(cell).trim() !== ''));
        if (headerIdx === -1) {
          setPreview({ rows: [], fileName: file.name, parseError: 'Sheet is empty.' });
          setBulkProgress(null);
          return;
        }

        const colMap = allRows[headerIdx].map(h => resolveField(String(h)));
        const dataRows = allRows
          .slice(headerIdx + 1)
          .filter(row => row.some(cell => String(cell).trim() !== ''));

        const rows = dataRows.map(row => {
          const norm = {};
          colMap.forEach((field, idx) => {
            norm[field] = String(row[idx] ?? '').trim();
          });
          norm._errors = validateRow(norm);
          return norm;
        });

        const detectedFields = new Set(colMap);
        const missingCols = REQUIRED_COLS.filter(c => !detectedFields.has(c));

        setPreview({ rows, fileName: file.name, missingCols });
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
        results.push({ ok: false, username: row.username, msg: err.response?.data?.message || 'Failed' });
      }
      setBulkProgress({ done: i + 1, total: validRows.length, results: [...results] });
    }

    setBulkRunning(false);
    fetchUsers();
  }

  function clearBulk() {
    setPreview(null);
    setBulkProgress(null);
  }

  const validCount   = preview ? preview.rows.filter(r => r._errors.length === 0).length : 0;
  const invalidCount = preview ? preview.rows.length - validCount : 0;

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div className="sticky-header">
        <nav className="breadcrumb">
          <span className="breadcrumb-current">Users Admin</span>
        </nav>
        <div className="page-header" style={{ marginBottom: 0, borderBottom: 'none' }}>
          <h1>Manage Users</h1>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {!showForm && !preview && (
              <>
                <button className="btn btn-secondary" onClick={downloadTemplate}>
                  Download Template
                </button>
                <button className="btn btn-secondary" onClick={() => fileInputRef.current.click()}>
                  Upload Excel
                </button>
                <button className="btn btn-primary" onClick={() => { setFormError(''); setShowForm(true); }}>
                  + Add User
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {formSuccess && <p className="login-success">{formSuccess}</p>}

      {/* ── Single-user form ── */}
      {showForm && (
        <form className="admin-form" onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>New User</h2>
          {formError && <p className="login-error">{formError}</p>}
          <div className="form-row">
            <div className="form-group">
              <label>Username <span className="required">*</span></label>
              <input name="username" className="form-input" value={form.username} onChange={handleChange} required autoFocus />
            </div>
            <div className="form-group">
              <label>Email <span className="required">*</span></label>
              <input name="email" type="email" className="form-input" value={form.email} onChange={handleChange} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Location <span className="required">*</span></label>
              <select name="location" className="form-input" value={form.location} onChange={handleChange} required>
                <option value="">Select a location…</option>
                {locations.map(l => (
                  <option key={l.id} value={l.name}>{l.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Role <span className="required">*</span></label>
              <select name="role" className="form-input" value={form.role} onChange={handleChange} required>
                <option value="">Select a role…</option>
                {roles.map(r => (
                  <option key={r.role} value={r.role}>{r.role}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Password <span className="required">*</span></label>
              <input name="password" type="password" className="form-input" value={form.password} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Confirm Password <span className="required">*</span></label>
              <input name="confirm" type="password" className="form-input" value={form.confirm} onChange={handleChange} required />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create User'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setFormError(''); }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ── Bulk upload preview ── */}
      {preview && (
        <div className="admin-section" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div>
              <strong>{preview.fileName}</strong>
              <span style={{ marginLeft: '1rem', color: 'var(--muted)', fontSize: '0.875rem' }}>
                {preview.rows.length} row{preview.rows.length !== 1 ? 's' : ''} parsed
                {invalidCount > 0 && (
                  <span style={{ color: '#ef4444', marginLeft: '0.5rem' }}>
                    · {invalidCount} invalid (will be skipped)
                  </span>
                )}
              </span>
            </div>
            {!bulkRunning && (
              <button className="btn btn-secondary" style={{ fontSize: '0.8rem' }} onClick={clearBulk}>
                Clear
              </button>
            )}
          </div>

          {preview.parseError && (
            <p className="login-error">{preview.parseError}</p>
          )}

          {preview.missingCols?.length > 0 && (
            <p className="login-error" style={{ marginBottom: '0.75rem' }}>
              Column{preview.missingCols.length > 1 ? 's' : ''} not found in sheet:{' '}
              <strong>{preview.missingCols.join(', ')}</strong>.{' '}
              Use "Download Template" to see the expected headers.
            </p>
          )}

          <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Location</th>
                  <th>Role</th>
                  <th>Password</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, i) => {
                  const result = bulkProgress?.results.find(r => r.username === row.username && preview.rows.indexOf(row) === i);
                  const isInvalid = row._errors.length > 0;
                  return (
                    <tr
                      key={i}
                      style={{
                        opacity: isInvalid ? 0.55 : 1,
                        background: result ? (result.ok ? '#f0fdf4' : '#fef2f2') : undefined,
                      }}
                    >
                      <td>{i + 1}</td>
                      <td data-label="Username">{row.username || <em style={{ color: '#ef4444' }}>missing</em>}</td>
                      <td data-label="Email">{row.email || <em style={{ color: '#ef4444' }}>missing</em>}</td>
                      <td data-label="Location">{row.location || <em style={{ color: '#ef4444' }}>missing</em>}</td>
                      <td data-label="Role">{row.role || <em style={{ color: '#ef4444' }}>missing</em>}</td>
                      <td data-label="Password">{row.password ? '••••••' : <em style={{ color: '#ef4444' }}>missing</em>}</td>
                      <td data-label="Status">
                        {result ? (
                          result.ok
                            ? <span style={{ color: '#16a34a', fontWeight: 600 }}>Created</span>
                            : <span style={{ color: '#ef4444' }} title={result.msg}>Failed</span>
                        ) : isInvalid ? (
                          <span style={{ color: '#f59e0b' }}>Missing: {row._errors.join(', ')}</span>
                        ) : (
                          <span style={{ color: 'var(--muted)' }}>Ready</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Progress bar */}
          {bulkProgress && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                <span>Creating users…</span>
                <span>{bulkProgress.done} / {bulkProgress.total}</span>
              </div>
              <div style={{ background: '#e5e7eb', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${(bulkProgress.done / bulkProgress.total) * 100}%`,
                    background: 'var(--primary, #2563eb)',
                    height: '100%',
                    transition: 'width 0.2s',
                  }}
                />
              </div>
              {bulkProgress.done === bulkProgress.total && (
                <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                  <span style={{ color: '#16a34a', fontWeight: 600 }}>
                    {bulkProgress.results.filter(r => r.ok).length} created
                  </span>
                  {bulkProgress.results.filter(r => !r.ok).length > 0 && (
                    <span style={{ color: '#ef4444', marginLeft: '0.75rem' }}>
                      {bulkProgress.results.filter(r => !r.ok).length} failed
                    </span>
                  )}
                </p>
              )}
            </div>
          )}

          {!bulkProgress && (
            <button
              className="btn btn-primary"
              disabled={validCount === 0}
              onClick={handleBulkCreate}
            >
              Create {validCount} User{validCount !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}

      {/* ── Users table ── */}
      {!showForm && !preview && (
        loading ? (
          <p>Loading users…</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Location</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map(u => {
                  const uid = u.id || u._id;
                  return (
                    <tr key={uid || u.username} style={{ opacity: deletingId === uid ? 0.4 : 1 }}>
                      <td data-label="Username">{u.username}</td>
                      <td data-label="Email">{u.email}</td>
                      <td data-label="Role">{u.role || '—'}</td>
                      <td data-label="Location">{u.location || u.city || '—'}</td>
                      <td data-label="Actions" className="action-cell">
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => setConfirmUser(u)}
                          disabled={deletingId === uid}
                        >
                          {deletingId === uid ? 'Deleting…' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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