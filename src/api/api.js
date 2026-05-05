import axios from 'axios';

const api = axios.create({
  baseURL: 'https://inspectpro-backend.cfapps.eu10-004.hana.ondemand.com/api'
});

// Categories
export const getCategories  = ()      => api.get('/categories');
export const createCategory = (data)  => api.post('/categories', data);
export const updateCategory = (id, data) => api.put(`/categories/${id}`, data);
export const deleteCategory = (id)    => api.delete(`/categories/${id}`);

// Form
export const getFormStep    = (slug, group) => api.get(`/form/${slug}?group=${group}`);
export const submitForm     = (slug, data)  => api.post(`/form/${slug}/submit`, data);

// Questions (admin)
export const getQuestions   = ()           => api.get('/questions');
export const getAllQuestions = ()           => api.get('/questions/all');
export const getQuestion    = (id)         => api.get(`/questions/${id}`);
export const createQuestion = (data)       => api.post('/questions', data);
export const updateQuestion = (id, data)   => api.put(`/questions/${id}`, data);
export const deleteQuestion = (id)         => api.delete(`/questions/${id}`);

// Submissions
export const getSubmissions = ()           => api.get('/submissions');
export const getSubmission  = (uuid)       => api.get(`/submissions/${uuid}`);
export const deleteSubmission = (uuid) => api.delete(`/submissions/${uuid}`);

// Locations
export const getLocations              = ()              => api.get('/locations');
export const getLocationCategories     = (slug)          => api.get(`/locations/${slug}/categories`);
export const createLocation            = (data)          => api.post('/locations', data);
export const updateLocation            = (id, data)      => api.put(`/locations/${id}`, data);
export const deleteLocation            = (id)            => api.delete(`/locations/${id}`);
export const getLocationCategoriesAssigned = (id)        => api.get(`/locations/${id}/categories-assigned`);
export const assignCategoryToLocation  = (id, data)      => api.post(`/locations/${id}/categories`, data);
export const removeCategoryFromLocation= (id, catId)     => api.delete(`/locations/${id}/categories/${catId}`);

export default api;