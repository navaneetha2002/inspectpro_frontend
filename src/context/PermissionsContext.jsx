import { createContext, useContext, useState } from 'react';
import {
  PERMISSIONS,
  loadRolePermissions,
  saveRolePermissions,
} from '../config/permissions';

const PermissionsContext = createContext(null);

export function PermissionsProvider({ children }) {
  const [rolePermissions, setRolePermissions] = useState(loadRolePermissions);

  /**
   * Returns true if the given role has the requested permission.
   * global_admin always returns true regardless of stored data.
   */
  function hasPermission(role, permission) {
    if (!role || !permission) return false;
    if (role === 'global_admin') return true;
    return (rolePermissions[role] || []).includes(permission);
  }

  /**
   * Replaces the full permission list for a role.
   * global_admin permissions cannot be modified.
   */
  function updateRolePermissions(role, permissions) {
    if (role === 'global_admin') return;
    const updated = { ...rolePermissions, [role]: permissions };
    saveRolePermissions(updated);
    setRolePermissions(updated);
  }

  /**
   * Adds a brand-new role with no permissions.
   */
  function addRole(role) {
    const trimmed = role.trim().toLowerCase();
    if (!trimmed || rolePermissions[trimmed]) return;
    updateRolePermissions(trimmed, []);
  }

  /**
   * Removes a role entirely. global_admin cannot be removed.
   */
  function removeRole(role) {
    if (role === 'global_admin') return;
    const { [role]: _, ...rest } = rolePermissions;
    saveRolePermissions(rest);
    setRolePermissions(rest);
  }

  return (
    <PermissionsContext.Provider
      value={{
        rolePermissions,
        allPermissions: PERMISSIONS,
        hasPermission,
        updateRolePermissions,
        addRole,
        removeRole,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}
