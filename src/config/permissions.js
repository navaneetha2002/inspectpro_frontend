// All available permission keys in the application.
// Add new activity keys here when new protected features are introduced.
export const PERMISSIONS = {
  VIEW_SUBMISSIONS:  'view_submissions',
  ADMIN_QUESTIONS:   'admin_questions',
  ADMIN_LOCATIONS:   'admin_locations',
  REGISTER_USER:     'register_user',
  MANAGE_PERMISSIONS:'manage_permissions',
};

// Human-readable labels for the permissions UI
export const PERMISSION_LABELS = {
  view_submissions:   'View Submissions',
  admin_questions:    'Manage Questions',
  admin_locations:    'Manage Locations',
  register_user:      'Register Users',
  manage_permissions: 'Manage Permissions',
};

// global_admin always receives every permission — this cannot be overridden.
// Other roles start with no permissions; global_admin grants them via the UI.
const DEFAULT_ROLE_PERMISSIONS = {
  global_admin: Object.values(PERMISSIONS),
};

const STORAGE_KEY = 'role_permissions';

export function loadRolePermissions() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Always ensure global_admin retains all permissions regardless of stored value
      parsed.global_admin = Object.values(PERMISSIONS);
      return parsed;
    }
  } catch {
    // fall through to default
  }
  return { ...DEFAULT_ROLE_PERMISSIONS };
}

export function saveRolePermissions(permissions) {
  // Guarantee global_admin is never downgraded
  const safe = { ...permissions, global_admin: Object.values(PERMISSIONS) };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
}
