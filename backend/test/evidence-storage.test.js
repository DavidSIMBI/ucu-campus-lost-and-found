import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  getDeclaredEvidenceMime,
  getEvidenceStorageDirectory,
  getEvidenceStoragePath,
  isValidStorageKey,
  MAX_EVIDENCE_FILE_SIZE,
  readEvidenceBuffer,
  removeEvidenceFiles,
  sanitizeOriginalFilename,
  storeEvidenceBuffer,
  validateEvidenceFile
} from '../src/services/evidence-storage.js';
import { REPORT_PHOTO_DIRECTORY } from '../src/config/report-storage.js';

const signatures = {
  jpg: Buffer.from([0xff, 0xd8, 0xff, 0x00]),
  png: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  pdf: Buffer.from('%PDF-1.7')
};

test('accepts supported file extensions with matching signatures and MIME types', () => {
  assert.equal(validateEvidenceFile({ originalname: 'proof.jpg', mimetype: 'image/jpeg', buffer: signatures.jpg }), null);
  assert.equal(validateEvidenceFile({ originalname: 'proof.PNG', mimetype: 'image/png', buffer: signatures.png }), null);
  assert.equal(validateEvidenceFile({ originalname: 'proof.pdf', mimetype: 'application/pdf', buffer: signatures.pdf }), null);
  assert.equal(getDeclaredEvidenceMime('proof.jpeg'), 'image/jpeg');
});

test('rejects unsupported extensions, MIME mismatches, and invalid signatures', () => {
  assert.match(validateEvidenceFile({ originalname: 'proof.txt', mimetype: 'text/plain', buffer: signatures.pdf }), /JPG, JPEG, PNG, or PDF/);
  assert.match(validateEvidenceFile({ originalname: 'proof.png', mimetype: 'image/jpeg', buffer: signatures.png }), /matching MIME/);
  assert.match(validateEvidenceFile({ originalname: 'proof.jpg', mimetype: 'image/jpeg', buffer: signatures.png }), /does not match/);
});

test('rejects empty and oversized evidence buffers', () => {
  assert.match(validateEvidenceFile({ originalname: 'empty.pdf', mimetype: 'application/pdf', buffer: Buffer.alloc(0) }), /between 1 byte and 5 MB/);
  assert.match(validateEvidenceFile({ originalname: 'large.pdf', mimetype: 'application/pdf', buffer: Buffer.alloc(MAX_EVIDENCE_FILE_SIZE + 1) }), /between 1 byte and 5 MB/);
});

test('sanitizes display filenames and rejects path traversal storage keys', () => {
  assert.equal(sanitizeOriginalFilename('..\\private\\proof.pdf'), 'proof.pdf');
  assert.equal(sanitizeOriginalFilename('..\\..\\'), 'evidence');
  assert.equal(isValidStorageKey('../proof.pdf'), false);
  assert.throws(() => getEvidenceStoragePath('../proof.pdf', path.join(os.tmpdir(), 'evidence-test')));
});

test('allows Railway private storage and rejects evidence paths served as report photos', () => {
  const previous = process.env.CLAIM_EVIDENCE_STORAGE_DIR;
  try {
    process.env.CLAIM_EVIDENCE_STORAGE_DIR = '/app/storage/private/claims';
    assert.equal(getEvidenceStorageDirectory(), '/app/storage/private/claims');

    process.env.CLAIM_EVIDENCE_STORAGE_DIR = path.join(REPORT_PHOTO_DIRECTORY, 'private');
    assert.throws(getEvidenceStorageDirectory, /outside public directories and report photo storage/);
  } finally {
    if (previous === undefined) delete process.env.CLAIM_EVIDENCE_STORAGE_DIR;
    else process.env.CLAIM_EVIDENCE_STORAGE_DIR = previous;
  }
});

test('stores evidence under randomized keys and removes only validated keys', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'ucu-evidence-test-'));
  try {
    const original = signatures.pdf;
    const key = await storeEvidenceBuffer(original, directory);

    assert.match(key, /^[a-f0-9]{64}$/);
    assert.deepEqual(await readEvidenceBuffer(key, directory), original);

    await removeEvidenceFiles([key], directory);
    await assert.rejects(readEvidenceBuffer(key, directory), { code: 'ENOENT' });
    await assert.rejects(removeEvidenceFiles(['../outside'], directory), TypeError);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
