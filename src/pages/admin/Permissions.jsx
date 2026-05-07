import { useState } from 'react';
import { usePermissions } from '../../context/PermissionsContext';
import { PERMISSION_LABELS } from '../../config/permissions';

export default function Permissions() {
  const { rolePermissions, allPermissions, updateRolePermissions, loading, error } =
    usePermissions();

  const [toast, setToast]   = useState('');
  const [saving, setSaving] = useState(false);

  // allPermissions is [{ id, name, description }] from the backend
  const editableRoles = Object.keys(rolePermissions).filter((r) => r !== 'global_admin');

  function notify(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
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
console.log('rolePermissions:', rolePermissions);
console.log('editableRoles:', editableRoles);
  return (
    <div style={{ padding: '1.5rem 0' }}>
      <h2>Role Permissions</h2>
      <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
        <strong>global_admin</strong> always has every permission and cannot be modified.
        Grant or revoke permissions for any other role below.
      </p>

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
