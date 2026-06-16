import { api } from './api.js';

export const partyService = {
  getAll: async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    const response = await api.get(`/parties${queryParams ? `?${queryParams}` : ''}`);
    if (response.data && response.pagination) {
      return response;
    }
    return { data: response, pagination: null };
  },
  create: async (data) => {
    return await api.post('/parties', data);
  },
  update: async (id, data) => {
    return await api.put(`/parties/${id}`, data);
  },
  delete: async (id) => {
    return await api.delete(`/parties/${id}`);
  }
};
