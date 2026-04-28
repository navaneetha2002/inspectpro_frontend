import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:3000/api' });

// Categories
export const getCategories  = ()           => api.get('/form/categories');

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

export default api;