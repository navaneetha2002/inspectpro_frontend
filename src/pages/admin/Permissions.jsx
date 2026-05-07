import { useState } from 'react';
import { usePermissions } from '../../context/PermissionsContext';
import { PERMISSION_LABELS } from '../../config/permissions';

export default function Permissions() {
  const { rolePermissions, allPermissions, updateRolePermissions, addRole, removeRole } =
    usePermissions();

  const [newRole, setNewRole] = useState('');
  const [toast, setToast]     = useState('');

  const permissionKeys = Object.values(allPermissions);
  const editableRoles  = Object.keys(rolePermissions).filter((r) => r !== 'global_admin');

  function notify(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  function togglePermission(role, permission) {
    const current = rolePermissions[role] || [];
    const updated  = current.includes(permission)
      ? current.filter((p) => p !== permission)
      : [...current, permission];
    updateRolePermissions(role, updated);
    notify(`Updated permissions for "${role}".`);
  }

  function handleAddRole() {
    const trimmed = newRole.trim().toLowerCase();
    if (!trimmed) return;
    if (rolePermissions[trimmed]) {
      notify(`Role "${trimmed}" already exists.`);
      return;
    }
    addRole(trimmed);
    setNewRole('');
    notify(`Role "${trimmed}" added.`);
  }

  function handleRemoveRole(role) {
    removeRole(role);
    notify(`Role "${role}" removed.`);
  }

  return (
    <div style={{ padding: '1.5rem 0' }}>
      <h2>Role Permissions</h2>
      <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
        <strong>global_admin</strong> always has every permission and cannot be modified.
        Grant or revoke permissions for any other role below.
      </p>

      {toast && <p className="login-success">{toast}</p>}

      {editableRoles.length === 0 ? (
        <p style={{ color: '#6b7280' }}>No additional roles yet. Add one below.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="permissions-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
            <thead>
              <tr>
                <th style={th}>Role</th>
                {permissionKeys.map((p) => (
                  <th key={p} style={th}>{PERMISSION_LABELS[p] || p}</th>
                ))}
                <th style={th}>Remove</th>
              </tr>
            </thead>
            <tbody>
              {editableRoles.map((role) => (
                <tr key={role}>
                  <td style={td}><strong>{role}</strong></td>
                  {permissionKeys.map((p) => (
                    <td key={p} style={{ ...td, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={(rolePermissions[role] || []).includes(p)}
                        onChange={() => togglePermission(role, p)}
                      />
                    </td>
                  ))}
                  <td style={{ ...td, textAlign: 'center' }}>
                    <button
                      className="btn"
                      style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                      onClick={() => handleRemoveRole(role)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="New role name (e.g. inspector)"
          value={newRole}
          onChange={(e) => setNewRole(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddRole()}
          style={{ padding: '0.4rem 0.75rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
        />
        <button className="btn btn-primary" onClick={handleAddRole}>
          Add Role
        </button>
      </div>
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
