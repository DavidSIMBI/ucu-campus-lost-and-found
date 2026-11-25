import { api } from './api.js';

export async function getFoundItems({ search = '', signal } = {}) {
  const response = await api.get('/reports', {
    params: { type: 'FOUND', search },
    signal
  });
  return response.data?.reports ?? [];
}

export async function getFoundItem(reportId, options = {}) {
  const response = await api.get(`/reports/${reportId}`, options);
  return response.data?.report;
}

export async function getPublicReport(reportId, options = {}) {
  const response = await api.get(`/reports/public/${reportId}`, options);
  return response.data?.report;
}
