import { randomUUID } from 'node:crypto';
import { mkdir, open, unlink } from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import sharp from 'sharp';
import { REPORT_PHOTO_DIRECTORY } from '../config/report-storage.js';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_INPUT_PIXELS = 40_000_000;
const MIME_FORMATS = new Map([
  ['image/jpeg', 'jpeg'],
  ['image/jpg', 'jpeg'],
  ['image/png', 'png'],
  ['image/webp', 'webp']
]);
const FORMAT_EXTENSIONS = {
  jpeg: 'jpg',
  png: 'png',
  webp: 'webp'
};
const STORED_FILENAME_PATTERN = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

function createPhotoError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_PHOTO_BYTES,
    files: 1,
    fields: 20,
    parts: 21
  },
  fileFilter(_request, file, callback) {
    if (!MIME_FORMATS.has(file.mimetype)) {
      return callback(createPhotoError('Photo must be a JPEG, PNG or WebP image.'));
    }

    return callback(null, true);
  }
});

export function reportPhotoUpload(request, response, next) {
  upload.single('photo')(request, response, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? 'Photo must be 5 MB or smaller.'
        : 'Only one photo may be uploaded with the photo field.';

      return response.status(status).json({ message });
    }

    if (error.status === 400) {
      return response.status(400).json({ message: error.message });
    }

    return next(error);
  });
}

function detectImageSignature(buffer) {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  ) {
    return 'jpeg';
  }

  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    return 'png';
  }

  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp';
  }

  return null;
}

export async function prepareReportPhoto(file) {
  if (!file) return null;

  if (!Buffer.isBuffer(file.buffer) || file.size > MAX_PHOTO_BYTES) {
    const error = createPhotoError('Photo must be 5 MB or smaller.');
    error.status = 413;
    throw error;
  }

  const declaredFormat = MIME_FORMATS.get(file.mimetype);
  const signatureFormat = detectImageSignature(file.buffer);

  if (!declaredFormat || signatureFormat !== declaredFormat) {
    throw createPhotoError('The uploaded photo content does not match its declared image type.');
  }

  try {
    const image = sharp(file.buffer, {
      failOn: 'warning',
      limitInputPixels: MAX_INPUT_PIXELS
    });
    const metadata = await image.metadata();

    if (metadata.format !== signatureFormat || !metadata.width || !metadata.height) {
      throw createPhotoError('The uploaded file is not a valid supported image.');
    }

    // Re-encoding removes metadata such as EXIF while retaining the image format.
    let output = sharp(file.buffer, {
      failOn: 'warning',
      limitInputPixels: MAX_INPUT_PIXELS
    }).rotate();

    if (signatureFormat === 'jpeg') {
      output = output.jpeg({ quality: 85 });
    } else if (signatureFormat === 'png') {
      output = output.png({ compressionLevel: 9 });
    } else {
      output = output.webp({ quality: 85 });
    }

    const buffer = await output.toBuffer();
    const filename = `${randomUUID()}.${FORMAT_EXTENSIONS[signatureFormat]}`;

    return { buffer, filename };
  } catch (error) {
    if (error.status === 400) throw error;
    throw createPhotoError('The uploaded file could not be decoded as a supported image.');
  }
}

export async function storePreparedReportPhoto(photo) {
  if (!photo || !STORED_FILENAME_PATTERN.test(photo.filename)) {
    throw new Error('Invalid generated report photo filename.');
  }

  await mkdir(REPORT_PHOTO_DIRECTORY, { recursive: true, mode: 0o750 });
  const destination = path.join(REPORT_PHOTO_DIRECTORY, photo.filename);
  let fileHandle;

  try {
    fileHandle = await open(destination, 'wx', 0o640);
    await fileHandle.writeFile(photo.buffer);
    await fileHandle.close();
    fileHandle = null;
  } catch (error) {
    if (fileHandle) {
      await fileHandle.close().catch(() => {});
      try {
        await unlink(destination);
      } catch (cleanupError) {
        if (cleanupError.code !== 'ENOENT') {
          console.error('Unable to remove a partial report photo after a storage error.');
        }
      }
    }
    throw error;
  }

  return photo.filename;
}

export async function deleteStoredReportPhoto(filename) {
  if (typeof filename !== 'string' || !STORED_FILENAME_PATTERN.test(filename)) {
    return false;
  }

  try {
    await unlink(path.join(REPORT_PHOTO_DIRECTORY, filename));
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

export function publicReportPhotoPath(filename) {
  if (typeof filename !== 'string' || !STORED_FILENAME_PATTERN.test(filename)) {
    return null;
  }

  return `/uploads/reports/${filename}`;
}
