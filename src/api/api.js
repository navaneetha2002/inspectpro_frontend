import axios from 'axios';

// Local dev: VITE_API_BASE_URL=/api  → Vite proxy forwards to localhost:3000
// Production: VITE_API_BASE_URL=https://...hana.ondemand.com/api
const BASE = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({ baseURL: BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const authApi = axios.create({ baseURL: BASE });

authApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  console.log('[authApi] url:', config.url, '| token:', token);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


export const login = (username, password) =>
  authApi.post('/auth/login', { username, password });

export const register = (username, email, password, location, role) =>
  authApi.post('/auth/register', { username, email, password, location, role });

// Users (admin)
export const getUsers   = ()   => authApi.get('/auth/users');
export const deleteUser = (id) => authApi.delete(`/auth/users/${id}`);


// Categories
export const getCategories  = ()      => api.get('/categories');
export const createCategory = (data)  => api.post('/categories', data);
export const updateCategory = (id, data) => api.put(`/categories/${id}`, data);
export const deleteCategory = (id)    => api.delete(`/categories/${id}`);

// Form
export const getFormStep             = (slug, group)     => api.get(`/form/${slug}?group=${group}`);
export const submitForm              = (slug, data)      => authApi.post(`/form/${slug}/submit`, data);
export const getMySubmissionForForm  = (slug, location, scheduleId) => {
  const p = new URLSearchParams();
  if (location)   p.set('location',    location);
  if (scheduleId) p.set('schedule_id', scheduleId);
  const qs = p.toString();
  return authApi.get(`/form/${slug}/my-submission${qs ? `?${qs}` : ''}`);
};
export const updateSubmissionStatus = (uuid, status, review_notes) =>
  authApi.patch(`/submissions/${uuid}/status`, { status, review_notes });
export const getMySubmittedForms     = (location)        => authApi.get(`/form/my-submissions${location ? `?location=${location}` : ''}`);

// Questions (admin)
export const getQuestions   = (params)     => api.get('/questions', { params });
export const getAllQuestions = ()           => api.get('/questions/all');
export const getQuestion    = (id)         => api.get(`/questions/${id}`);
export const createQuestion = (data)       => api.post('/questions', data);
export const updateQuestion = (id, data)   => api.put(`/questions/${id}`, data);
export const deleteQuestion = (id)         => api.delete(`/questions/${id}`);

// Submissions
export const getSubmissions = ()           => authApi.get('/submissions');
export const getSubmission  = (uuid)       => api.get(`/submissions/${uuid}`);
export const deleteSubmission = (uuid) => api.delete(`/submissions/${uuid}`);

// Locations
export const getLocationById = (id) => authApi.get(`/locations/${id}`);
export const getLocations              = ()              => api.get('/locations');
export const getLocationCategories     = (slug)          => api.get(`/locations/${slug}/categories`);
export const createLocation            = (data)          => api.post('/locations', data);
export const updateLocation            = (id, data)      => api.put(`/locations/${id}`, data);
export const deleteLocation            = (id)            => api.delete(`/locations/${id}`);
export const getLocationCategoriesAssigned = (id)        => api.get(`/locations/${id}/categories-assigned`);
export const assignCategoryToLocation  = (id, data)      => api.post(`/locations/${id}/categories`, data);
export const removeCategoryFromLocation= (id, catId)     => api.delete(`/locations/${id}/categories/${catId}`);

// Permissions
export const getAllPermissions      = ()              => authApi.get('/permissions');
export const getRolesWithPerms      = ()              => authApi.get('/permissions/roles');
export const getRolePerms           = (roleName)      => authApi.get(`/permissions/roles/${roleName}`);
export const putRolePermissions     = (roleName, ids) => authApi.put(`/permissions/roles/${roleName}`, { permissions: ids });
export const createRole             = (name, description) => authApi.post('/auth/roles', { name, description });

// Schedules
export const getSchedules             = ()                      => authApi.get('/schedules');
export const createSchedule           = (data)                   => authApi.post('/schedules', data);
export const updateSchedule           = (id, data)               => authApi.put(`/schedules/${id}`, data);
export const updateScheduleStatus     = (id, status, submissionUuid) => authApi.patch(`/schedules/${id}/status`, { status, ...(submissionUuid ? { submission_uuid: submissionUuid } : {}) });
export const deleteSchedule           = (id)                     => authApi.delete(`/schedules/${id}`);
export const getInspectors = () =>
  api.get('/schedules/inspectors');

export const getInspectorsByExcludingLocation = (locationId) =>
  api.get(`/schedules/inspectors?exclude_location_id=${locationId}`);

export const getAttendees = () =>
  api.get('/schedules/attendees');

export const getAttendeesByLocation = (locationId) =>
  api.get(`/schedules/attendees?location_id=${locationId}`);

export default api;