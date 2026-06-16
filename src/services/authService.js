import { api } from './api.js';
import { STORAGE_KEYS } from '../constants/defaults.js';

export const authService = {
  login: async (userId, password) => {
    return await api.post('/auth/login', { userId, password });
  },
  me: async () => {
    return await api.get('/auth/me');
  },
  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
  }
};
