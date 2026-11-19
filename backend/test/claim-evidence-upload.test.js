import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { parseClaimEvidence } from '../src/middleware/claim-evidence-upload.js';
import { MAX_EVIDENCE_FILE_SIZE, validateEvidenceFile } from '../src/services/evidence-storage.js';

const boundary = '----ucu-claims-test-boundary';

function createMultipartBody(files) {
  const chunks = [];
  chunks.push(Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="reportId"\r\n\r\n42\r\n` +
    `--${boundary}\r\nContent-Disposition: form-data; name="justification"\r\n\r\nI can identify the item.\r\n`
  ));

  for (const file of files) {
    chunks.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="evidenceFiles"; filename="${file.filename}"\r\n` +
      `Content-Type: ${file.mimeType}\r\n\r\n`
    ));
    chunks.push(file.content);
    chunks.push(Buffer.from('\r\n'));
  }

  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return Buffer.concat(chunks);
}

function runUpload(files) {
  const body = createMultipartBody(files);
  const request = Readable.from([body]);
  request.method = 'POST';
  request.headers = {
    'content-type': `multipart/form-data; boundary=${boundary}`,
    'content-length': String(body.length)
  };
  request.body = {};

  const response = {
    statusCode: null,
    payload: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; }
  };

  return new Promise((resolve, reject) => {
    parseClaimEvidence(request, response, (error) => {
      if (error) reject(error);
      else resolve({ request, response });
    });
    const checkResponse = () => {
      if (response.statusCode !== null) resolve({ request, response });
    };
    const interval = setInterval(() => {
      if (response.statusCode !== null) {
        clearInterval(interval);
        checkResponse();
      }
    }, 5);
    setTimeout(() => {
      clearInterval(interval);
      if (response.statusCode === null) reject(new Error('Upload middleware did not finish.'));
    }, 3000).unref();
  });
}

test('parses a multipart request containing a supported evidence file', async () => {
  const { request } = await runUpload([{
    filename: 'proof.pdf',
    mimeType: 'application/pdf',
    content: Buffer.from('%PDF-1.7')
  }]);

  assert.equal(request.body.reportId, '42');
  assert.match(request.body.justification, /identify the item/);
  assert.equal(request.files.length, 1);
  assert.equal(validateEvidenceFile(request.files[0]), null);
});

test('rejects unsupported file extensions and MIME types', async () => {
  const { response } = await runUpload([{
    filename: 'proof.txt',
    mimeType: 'text/plain',
    content: Buffer.from('not evidence')
  }]);

  assert.equal(response.statusCode, 400);
});

test('rejects more than five files and files larger than five megabytes', async () => {
  const tooMany = Array.from({ length: 6 }, (_, index) => ({
    filename: `proof${index}.pdf`,
    mimeType: 'application/pdf',
    content: Buffer.from('%PDF-1.7')
  }));
  const countResponse = await runUpload(tooMany);
  assert.equal(countResponse.response.statusCode, 413);

  const sizeResponse = await runUpload([{
    filename: 'large.pdf',
    mimeType: 'application/pdf',
    content: Buffer.concat([Buffer.from('%PDF-1.7'), Buffer.alloc(MAX_EVIDENCE_FILE_SIZE)])
  }]);
  assert.equal(sizeResponse.response.statusCode, 413);
});
