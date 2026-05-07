import { createContext, useContext, useState, useEffect } from 'react';
import { getAllPermissions, getRolesWithPerms, getRolePerms, putRolePermissions } from '../api/api';
import { useAuth } from './AuthContext';

const PermissionsContext = createContext(null);

export function PermissionsProvider({ children }) {
  const { token, role, isGlobalAdmin } = useAuth();

  // All available permissions [{id, name, description}] — fetched for every user
  const [allPermissions, setAllPermissions] = useState([]);
  // The logged-in user's permission IDs — checked by ID, not name
  const [myPermissionIds, setMyPermissionIds] = useState(new Set());
  // For admin Permissions page: { roleName: [permName, ...] }
  const [rolePermissions, setRolePermissions] = useState({});
  // Start true when token exists so route guards wait before deciding
  const [loading, setLoading] = useState(!!token);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token || !role) {
      setAllPermissions([]);
      setMyPermissionIds(new Set());
      setRolePermissions({});
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    if (isGlobalAdmin) {
      Promise.all([getAllPermissions(), getRolesWithPerms()])
        .then(([permsRes, rolesRes]) => {
          const perms = permsRes.data;
          setAllPermissions(perms);
          setMyPermissionIds(new Set(perms.map(p => p.id))); // admin has all

          const byRole = {};
          for (const r of rolesRes.data) {
            byRole[r.role] = r.permissions.map(p => p.name);
          }
          byRole.global_admin = perms.map(p => p.name);
          setRolePermissions(byRole);
        })
        .catch(() => setError('Failed to load permissions from server.'))
        .finally(() => setLoading(false));
    } else {
      // Fetch all permissions (for name→ID lookup) + this user's role permissions
      Promise.all([getAllPermissions(), getRolePerms(role)])
        .then(([permsRes, roleRes]) => {
          setAllPermissions(permsRes.data);
          setMyPermissionIds(new Set(roleRes.data.permissions.map(p => p.id)));
        })
        .catch(() => setError('Failed to load permissions from server.'))
        .finally(() => setLoading(false));
    }
  }, [token, role, isGlobalAdmin]);

  // Check by permission name — resolves to ID internally so names are just lookup keys
  function hasPermission(permissionName) {
    if (!permissionName) return false;
    if (isGlobalAdmin) return true;
    const perm = allPermissions.find(p => p.name === permissionName);
    if (!perm) return false;
    return myPermissionIds.has(perm.id);
  }

  async function updateRolePermissions(roleName, permNames) {
    if (!isGlobalAdmin) return;
    const ids = allPermissions
      .filter(p => permNames.includes(p.name))
      .map(p => p.id);
    await putRolePermissions(roleName, ids);
    setRolePermissions(prev => ({ ...prev, [roleName]: permNames }));
  }

  return (
    <PermissionsContext.Provider
      value={{
        myPermissionIds,
        rolePermissions,
        allPermissions,
        hasPermission,
        updateRolePermissions,
        loading,
        error,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}
