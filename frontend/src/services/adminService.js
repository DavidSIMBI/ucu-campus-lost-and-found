import { api } from './api.js';

export async function getAdminDashboardStatistics(options = {}) {
  const response = await api.get('/admin/dashboard', options);
  return response.data;
}

export async function getAdminClaims({ status = '', search = '', sort = 'pending', page = 1, limit = 20, signal } = {}) {
  const response = await api.get('/admin/claims', {
    params: { status: status || undefined, search: search || undefined, sort, page, limit },
    signal
  });
  return response.data;
}

export async function getAdminClaim(claimId, options = {}) {
  const response = await api.get(`/admin/claims/${claimId}`, options);
  return response.data?.claim;
}

export async function reviewClaim(claimId, decision, reviewNote = '') {
  const response = await api.patch(`/admin/claims/${claimId}`, { decision, reviewNote });
  return response.data;
}

export async function completeHandover(claimId) {
  const response = await api.post(`/admin/claims/${claimId}/complete`);
  return response.data;
}

export async function getAdminUsers({ role = '', search = '', page = 1, limit = 25, signal } = {}) {
  const response = await api.get('/admin/users', {
    params: { role: role || undefined, search: search || undefined, page, limit },
    signal
  });
  return response.data;
}
