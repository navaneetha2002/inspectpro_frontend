import { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

  const fetchPermissions = useCallback(() => {
    if (!token || !role) {
      setAllPermissions([]);
      setMyPermissionIds(new Set());
      setRolePermissions({});
      setLoading(false);
      return Promise.resolve();
    }

    setLoading(true);
    setError(null);

    const work = isGlobalAdmin
      ? Promise.all([getAllPermissions(), getRolesWithPerms()])
          .then(([permsRes, rolesRes]) => {
            const perms = permsRes.data;
            setAllPermissions(perms);
            setMyPermissionIds(new Set(perms.map(p => p.id)));
            const byRole = {};
            for (const r of rolesRes.data) {
              byRole[r.role] = r.permissions.map(p => p.name);
            }
            byRole.global_admin = perms.map(p => p.name);
            setRolePermissions(byRole);
          })
      : Promise.all([getAllPermissions(), getRolePerms(role)])
          .then(([permsRes, roleRes]) => {
            setAllPermissions(permsRes.data);
            setMyPermissionIds(new Set(roleRes.data.permissions.map(p => p.id)));
          });

    return work
      .catch(() => setError('Failed to load permissions from server.'))
      .finally(() => setLoading(false));
  }, [token, role, isGlobalAdmin]);

  useEffect(() => { fetchPermissions(); }, [fetchPermissions]);

  // Check by permission name — resolves to ID internally so names are just lookup keys
  function hasPermission(permissionName) {
    if (!permissionName) return false;
    if (isGlobalAdmin) return true;
    const perm = allPermissions.find(p => p.name === permissionName);
    if (!perm) return false;
    return myPermissionIds.has(perm.id);
  }

  const updateRolePermissions = useCallback(async (roleName, permNames) => {
    if (!isGlobalAdmin) return;
    const ids = allPermissions
      .filter(p => permNames.includes(p.name))
      .map(p => p.id);
    await putRolePermissions(roleName, ids);
    setRolePermissions(prev => ({ ...prev, [roleName]: permNames }));
  }, [isGlobalAdmin, allPermissions]);

  return (
    <PermissionsContext.Provider
      value={{
        myPermissionIds,
        rolePermissions,
        allPermissions,
        hasPermission,
        updateRolePermissions,
        refresh: fetchPermissions,
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
