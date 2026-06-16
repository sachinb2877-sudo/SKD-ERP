import { api } from './api.js';

export const dataService = {
  getAccounts: async () => {
    return await api.get('/accounts');
  },
  getCategories: async () => {
    return await api.get('/categories');
  },
  createCategory: async (name) => {
    return await api.post('/categories', { name });
  },
  getDashboard: async () => {
    return await api.get('/dashboard');
  }
};
