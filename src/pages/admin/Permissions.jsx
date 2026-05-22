import { useState } from 'react';
import { usePermissions } from '../../context/PermissionsContext';
import { PERMISSION_LABELS } from '../../config/permissions';
import { createRole } from '../../api/api';

export default function Permissions() {
  const { rolePermissions, allPermissions, updateRolePermissions, loading, error, refresh } =
    usePermissions();

  const [toast, setToast]           = useState('');
  const [saving, setSaving]         = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [addingRole, setAddingRole] = useState(false);
  const [showAddRole, setShowAddRole] = useState(false);

  const editableRoles = Object.keys(rolePermissions).filter(r => r !== 'global_admin');

  function notify(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  async function handleAddRole() {
    const name = newRoleName.trim().toLowerCase();
    if (!name) return;
    if (rolePermissions[name]) { notify(`Role "${name}" already exists.`); return; }
    setAddingRole(true);
    try {
      await createRole(name, newRoleDesc.trim());
      await refresh();
      setNewRoleName(''); setNewRoleDesc('');
      setShowAddRole(false);
      notify(`Role "${name}" created.`);
    } catch (err) {
      notify(err.response?.data?.error || `Failed to create role "${name}".`);
    } finally {
      setAddingRole(false);
    }
  }

  async function togglePermission(role, permName) {
    const current = rolePermissions[role] || [];
    const updated = current.includes(permName)
      ? current.filter(p => p !== permName)
      : [...current, permName];
    setSaving(true);
    try {
      await updateRolePermissions(role, updated);
      notify(`Updated permissions for "${role}".`);
    } catch {
      notify(`Failed to update permissions for "${role}".`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="p-4 text-muted">Loading permissions…</p>;
  if (error)   return <p className="p-4 text-danger">{error}</p>;

  return (
    <div className="py-3">
      <div className="d-flex align-items-center gap-3 mb-2">
        <h2 className="h5 fw-bold mb-0">Role Permissions</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddRole(r => !r)}>
          {showAddRole ? 'Cancel' : '+ Add Role'}
        </button>
      </div>
      <p className="text-muted small mb-3">
        <strong>global_admin</strong> always has every permission and cannot be modified.
        Grant or revoke permissions for any other role below.
      </p>

      {showAddRole && (
        <div className="d-flex gap-2 align-items-center mb-3 flex-wrap">
          <input type="text" className="form-control" style={{ minWidth: '200px', width: 'auto' }}
            placeholder="Role name (e.g. inspector)"
            value={newRoleName} onChange={e => setNewRoleName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddRole()} />
          <input type="text" className="form-control" style={{ minWidth: '200px', width: 'auto' }}
            placeholder="Description (optional)"
            value={newRoleDesc} onChange={e => setNewRoleDesc(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddRole()} />
          <button className="btn btn-primary" onClick={handleAddRole}
            disabled={addingRole || !newRoleName.trim()}>
            {addingRole ? 'Creating…' : 'Create Role'}
          </button>
        </div>
      )}

      {toast && <div className="alert alert-success py-2">{toast}</div>}
      {saving && <p className="text-muted small">Saving…</p>}

      {editableRoles.length === 0 ? (
        <p className="text-muted">No additional roles found.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-bordered table-sm">
            <thead className="table-light">
              <tr>
                <th>Role</th>
                {allPermissions.map(p => (
                  <th key={p.id} className="text-center" style={{ minWidth: '80px' }}>
                    {PERMISSION_LABELS[p.name] || p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {editableRoles.map(role => (
                <tr key={role}>
                  <td className="fw-semibold">{role}</td>
                  {allPermissions.map(p => (
                    <td key={p.id} className="text-center">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={(rolePermissions[role] || []).includes(p.name)}
                        onChange={() => togglePermission(role, p.name)}
                        disabled={saving}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

