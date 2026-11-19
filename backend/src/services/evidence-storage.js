import { randomBytes } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const MAX_EVIDENCE_FILES = 5;
export const MAX_EVIDENCE_FILE_SIZE = 5 * 1024 * 1024;

const MIME_BY_EXTENSION = new Map([
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.pdf', 'application/pdf']
]);

function getFileSignatureMime(buffer) {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  ) {
    return 'image/jpeg';
  }

  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png';
  }

  if (buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-') {
    return 'application/pdf';
  }

  return null;
}

export function getDeclaredEvidenceMime(filename) {
  return MIME_BY_EXTENSION.get(path.extname(String(filename)).toLowerCase()) ?? null;
}

export function validateEvidenceFile(file) {
  if (!file || !Buffer.isBuffer(file.buffer)) {
    return 'Each evidence file must contain file data.';
  }

  if (file.buffer.length < 1 || file.buffer.length > MAX_EVIDENCE_FILE_SIZE) {
    return 'Each evidence file must be between 1 byte and 5 MB.';
  }

  const declaredMime = getDeclaredEvidenceMime(file.originalname);
  if (!declaredMime || declaredMime !== file.mimetype) {
    return 'Evidence files must be JPG, JPEG, PNG, or PDF with a matching MIME type.';
  }

  if (getFileSignatureMime(file.buffer) !== declaredMime) {
    return 'An evidence file does not match its file type.';
  }

  return null;
}

export function sanitizeOriginalFilename(filename) {
  const basename = path.posix.basename(String(filename).replaceAll('\\', '/'));
  const safeName = basename
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 255);

  return !safeName || safeName === '.' || safeName === '..' ? 'evidence' : safeName;
}

export function createStorageKey() {
  return randomBytes(32).toString('hex');
}

export function isValidStorageKey(storageKey) {
  return typeof storageKey === 'string' && /^[a-f0-9]{64}$/.test(storageKey);
}

export function getEvidenceStorageDirectory() {
  const configured = process.env.CLAIM_EVIDENCE_STORAGE_DIR || './storage/private/claims';
  const resolved = path.resolve(process.cwd(), configured);
  const publicRoots = [
    path.resolve(process.cwd(), 'public'),
    path.resolve(process.cwd(), '../frontend/public')
  ];

  for (const publicRoot of publicRoots) {
    const relative = path.relative(publicRoot, resolved);
    if (relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))) {
      throw new Error('Claim evidence storage must be outside public directories.');
    }
  }

  return resolved;
}

export function getEvidenceStoragePath(storageKey, directory = getEvidenceStorageDirectory()) {
  if (!isValidStorageKey(storageKey)) {
    throw new TypeError('Invalid evidence storage key.');
  }

  const root = path.resolve(directory);
  const resolved = path.resolve(root, storageKey);

  if (path.dirname(resolved) !== root) {
    throw new TypeError('Invalid evidence storage path.');
  }

  return resolved;
}

export async function storeEvidenceBuffer(buffer, directory = getEvidenceStorageDirectory()) {
  const storageKey = createStorageKey();
  const filePath = getEvidenceStoragePath(storageKey, directory);

  await mkdir(directory, { recursive: true, mode: 0o700 });
  await writeFile(filePath, buffer, { flag: 'wx', mode: 0o600 });

  return storageKey;
}

export async function readEvidenceBuffer(storageKey, directory = getEvidenceStorageDirectory()) {
  return readFile(getEvidenceStoragePath(storageKey, directory));
}

export async function removeEvidenceFiles(storageKeys, directory = getEvidenceStorageDirectory()) {
  await Promise.all((storageKeys ?? []).map(async (storageKey) => {
    try {
      await unlink(getEvidenceStoragePath(storageKey, directory));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }));
}
