// Permission name constants — values must exactly match the `name` column in the permissions table.
export const PERMISSIONS = {
  VIEW_SUBMISSIONS:   'view_submissions',
  CREATE_SUBMISSION:  'create_submission',
  MANAGE_QUESTIONS:   'manage_questions',
  VIEW_IMAGES:        'view_images',
  MANAGE_LOCATIONS:   'manage_locations',
  REGISTER_USER:      'register_user',
  MANAGE_PERMISSIONS: 'manage_permissions',
  VIEW_SCHEDULES:   'view_schedules',
  CREATE_SCHEDULE:  'create_schedule',
  MANAGE_SCHEDULES: 'manage_schedules',
};

// Human-readable labels for the permissions UI.
export const PERMISSION_LABELS = {
  view_submissions:   'View Submissions',
  create_submission:  'Submit Forms',
  manage_questions:   'Manage Questions',
  view_images:        'View Images',
  manage_locations:   'Manage Locations',
  register_user:      'Register Users',
  manage_permissions: 'Manage Permissions',
  view_schedules:   'View Schedule',
  create_schedule:  'Create Schedule',
  manage_schedules: 'Manage Schedules',
};

// Permissions granted to local_admin by default (all except location-related)
export const LOCAL_ADMIN_DEFAULT_PERMISSIONS = [
  'view_submissions',
  'create_submission',
  'manage_questions',
  'view_images',
  'register_user',
  'manage_permissions',
  'view_schedules',
  'create_schedule',
  'manage_schedules',
  // NOT included: 'manage_locations'
];
