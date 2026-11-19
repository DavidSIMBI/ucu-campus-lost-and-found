import { api } from './api.js';

export async function getAdminDashboardStatistics(options = {}) {
  const response = await api.get('/admin/dashboard', options);
  return response.data?.statistics;
}
