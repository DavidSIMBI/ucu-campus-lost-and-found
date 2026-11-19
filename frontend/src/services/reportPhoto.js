import { api } from './api.js';

export const MAX_REPORT_PHOTO_BYTES = 5 * 1024 * 1024;

const ALLOWED_PHOTO_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
]);
const ALLOWED_PHOTO_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);

export function validateReportPhoto(file) {
  if (!file) return '';

  if (file.size > MAX_REPORT_PHOTO_BYTES) {
    return 'This file was not added. Choose a photo that is 5 MB or smaller, or continue without a photo.';
  }

  const extension = file.name.split('.').pop()?.toLowerCase();

  if (!ALLOWED_PHOTO_EXTENSIONS.has(extension) || !ALLOWED_PHOTO_TYPES.has(file.type)) {
    return 'This file was not added. Choose a JPEG, JPG, PNG or WebP image, or continue without a photo.';
  }

  return '';
}

export function getReportPhotoUrl(photoPath) {
  if (typeof photoPath !== 'string') return '';

  const match = /^\/uploads\/reports\/[a-z0-9-]+\.(jpg|png|webp)$/.exec(photoPath);

  if (!match) return '';

  const apiOrigin = new URL(api.defaults.baseURL, window.location.origin).origin;
  return new URL(photoPath, apiOrigin).toString();
}
