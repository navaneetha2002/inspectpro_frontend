import { useState } from 'react';
import { usePermissions } from '../../context/PermissionsContext';
import { PERMISSION_LABELS } from '../../config/permissions';
import { createRole } from '../../api/api';

export default function Permissions() {
  const { rolePermissions, allPermissions, updateRolePermissions, loading, error, refresh } =
    usePermissions();

  const [toast, setToast]     = useState('');
  const [saving, setSaving]   = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [addingRole, setAddingRole]   = useState(false);
  const [showAddRole, setShowAddRole] = useState(false);

  // allPermissions is [{ id, name, description }] from the backend
  const editableRoles = Object.keys(rolePermissions).filter((r) => r !== 'global_admin');

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
      setNewRoleName('');
      setNewRoleDesc('');
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
      ? current.filter((p) => p !== permName)
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

  if (loading) return <p style={{ padding: '2rem', color: '#6b7280' }}>Loading permissions…</p>;
  if (error)   return <p style={{ padding: '2rem', color: '#ef4444' }}>{error}</p>;

  return (
    <div style={{ padding: '1.5rem 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
        <h2 style={{ margin: 0 }}>Role Permissions</h2>
        <button className="btn btn-primary" onClick={() => setShowAddRole(r => !r)}>
          {showAddRole ? 'Cancel' : '+ Add Role'}
        </button>
      </div>
      <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
        <strong>global_admin</strong> always has every permission and cannot be modified.
        Grant or revoke permissions for any other role below.
      </p>

      {showAddRole && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Role name (e.g. inspector)"
            value={newRoleName}
            onChange={e => setNewRoleName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddRole()}
            style={{ padding: '0.4rem 0.75rem', borderRadius: '4px', border: '1px solid #d1d5db', minWidth: '200px' }}
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newRoleDesc}
            onChange={e => setNewRoleDesc(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddRole()}
            style={{ padding: '0.4rem 0.75rem', borderRadius: '4px', border: '1px solid #d1d5db', minWidth: '200px' }}
          />
          <button className="btn btn-primary" onClick={handleAddRole} disabled={addingRole || !newRoleName.trim()}>
            {addingRole ? 'Creating…' : 'Create Role'}
          </button>
        </div>
      )}

      {toast && <p className="login-success">{toast}</p>}
      {saving && <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>Saving…</p>}

      {editableRoles.length === 0 ? (
        <p style={{ color: '#6b7280' }}>No additional roles found.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="permissions-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
            <thead>
              <tr>
                <th style={th}>Role</th>
                {allPermissions.map((p) => (
                  <th key={p.id} style={th}>{PERMISSION_LABELS[p.name] || p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {editableRoles.map((role) => (
                <tr key={role}>
                  <td style={td}><strong>{role}</strong></td>
                  {allPermissions.map((p) => (
                    <td key={p.id} style={{ ...td, textAlign: 'center' }}>
                      <input
                        type="checkbox"
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

const th = {
  padding: '0.6rem 1rem',
  background: '#f3f4f6',
  border: '1px solid #e5e7eb',
  textAlign: 'left',
  fontSize: '0.85rem',
};

const td = {
  padding: '0.6rem 1rem',
  border: '1px solid #e5e7eb',
  fontSize: '0.9rem',
};
