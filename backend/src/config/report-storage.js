import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_REPORT_PHOTO_DIRECTORY = fileURLToPath(
  new URL('../../uploads/reports/', import.meta.url)
);

export const REPORT_PHOTO_DIRECTORY = path.resolve(
  process.env.REPORT_PHOTO_STORAGE_DIR || DEFAULT_REPORT_PHOTO_DIRECTORY
);
