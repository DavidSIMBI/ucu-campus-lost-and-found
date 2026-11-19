import { fileURLToPath } from 'node:url';

export const REPORT_PHOTO_DIRECTORY = fileURLToPath(
  new URL('../../uploads/reports/', import.meta.url)
);
