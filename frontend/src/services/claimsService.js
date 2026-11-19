import { api } from './api.js';

export async function getMyClaims(options = {}) {
  const response = await api.get('/claims/mine', options);
  return response.data?.claims ?? [];
}

export async function getMyClaim(claimId, options = {}) {
  const response = await api.get(`/claims/${claimId}`, options);
  return response.data?.claim;
}

export async function submitClaim({ reportId, justification, files, onUploadProgress, signal }) {
  const formData = new FormData();
  formData.append('reportId', String(reportId));
  formData.append('justification', justification);
  for (const file of files) formData.append('evidenceFiles', file);

  const response = await api.post('/claims', formData, {
    signal,
    onUploadProgress,
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
}

export async function withdrawClaim(claimId) {
  const response = await api.patch(`/claims/${claimId}`, { action: 'WITHDRAW' });
  return response.data;
}

export async function getEvidenceFile(claimId, fileId) {
  const response = await api.get(`/claims/${claimId}/evidence/${fileId}`, {
    responseType: 'blob'
  });
  return response.data;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename || 'evidence';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
