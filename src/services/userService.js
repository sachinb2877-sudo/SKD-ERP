import { api } from './api.js';

export const userService = {
  getAll: async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    const response = await api.get(`/users${queryParams ? `?${queryParams}` : ''}`);
    if (response.data && response.pagination) {
      return response;
    }
    return { data: response, pagination: null };
  },
  create: async (data) => {
    return await api.post('/users', data);
  },
  update: async (id, data) => {
    return await api.put(`/users/${id}`, data);
  },
  updatePermissions: async (id, permissions) => {
    return await api.put(`/users/${id}/permissions`, { permissions });
  },
  delete: async (id) => {
    return await api.delete(`/users/${id}`);
  }
};
