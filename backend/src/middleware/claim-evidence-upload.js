import {
  getDeclaredEvidenceMime,
  MAX_EVIDENCE_FILE_SIZE,
  MAX_EVIDENCE_FILES
} from '../services/evidence-storage.js';

let multer = null;
try {
  ({ default: multer } = await import('multer'));
} catch (error) {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
}

const upload = multer?.({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_EVIDENCE_FILE_SIZE,
    files: MAX_EVIDENCE_FILES,
    fields: 2,
    parts: MAX_EVIDENCE_FILES + 2,
    fieldNameSize: 64,
    fieldSize: 65535
  },
  fileFilter(_request, file, callback) {
    const expectedMime = getDeclaredEvidenceMime(file.originalname);

    if (!expectedMime || file.mimetype !== expectedMime) {
      const error = new Error('Evidence files must be JPG, JPEG, PNG, or PDF with a matching MIME type.');
      error.status = 400;
      callback(error);
      return;
    }

    callback(null, true);
  }
});

export function parseClaimEvidence(request, response, next) {
  if (!upload) {
    response.status(503).json({
      message: 'Evidence uploads are unavailable until the approved multipart parser dependency is installed.'
    });
    return;
  }

  upload.array('evidenceFiles', MAX_EVIDENCE_FILES)(request, response, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      const isLimit = ['LIMIT_FILE_SIZE', 'LIMIT_FILE_COUNT', 'LIMIT_PART_COUNT'].includes(error.code);
      response.status(isLimit ? 413 : 400).json({
        message: isLimit
          ? 'Evidence uploads are limited to 5 files of up to 5 MB each.'
          : 'The evidence upload fields are invalid.'
      });
      return;
    }

    response.status(error.status || 400).json({
      message: error.status === 400
        ? error.message
        : 'Unable to process the evidence upload.'
    });
  });
}
