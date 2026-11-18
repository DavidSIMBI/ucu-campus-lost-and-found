
import { Router } from 'express';
import { database } from '../config/database.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
const MYSQL_TEXT_MAX_BYTES = 65535;

router.use(authenticate);

function exceedsMysqlTextLimit(value) {
  return Buffer.byteLength(value.trim(), 'utf8') > MYSQL_TEXT_MAX_BYTES;
}

function isValidEventDate(value) {
  if (typeof value !== 'string') {
    return false;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (year < 1000 || month < 1 || month > 12 || day < 1) {
    return false;
  }

  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [
    31,
    isLeapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31
  ];

  return day <= daysInMonth[month - 1];
}

function isValidReportId(value) {
  const reportId = Number(value);
  return Number.isSafeInteger(reportId) && reportId > 0 ? reportId : null;
}

function validateReportUpdate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'A report object is required.';
  }

  const protectedFields = [
    'id',
    'reporter_id',
    'reporterId',
    'status',
    'returned_at',
    'returnedAt',
    'created_at',
    'createdAt',
    'updated_at',
    'updatedAt'
  ];

  if (protectedFields.some((field) => Object.hasOwn(body, field))) {
    return 'Report ownership and status fields cannot be changed.';
  }

  if (
    typeof body.title !== 'string' ||
    body.title.trim().length < 3 ||
    body.title.trim().length > 140
  ) {
    return 'Title must be between 3 and 140 characters.';
  }

  if (typeof body.description !== 'string' || !body.description.trim()) {
    return 'Description is required.';
  }

  if (exceedsMysqlTextLimit(body.description)) {
    return 'Description must be 65,535 UTF-8 bytes or fewer.';
  }

  if (
    typeof body.identifyingDetails === 'string' &&
    exceedsMysqlTextLimit(body.identifyingDetails)
  ) {
    return 'Private identifying details must be 65,535 UTF-8 bytes or fewer.';
  }

  if (
    typeof body.category !== 'string' ||
    !body.category.trim() ||
    body.category.trim().length > 60
  ) {
    return 'Category is required and must be 60 characters or fewer.';
  }

  if (
    typeof body.location !== 'string' ||
    !body.location.trim() ||
    body.location.trim().length > 160
  ) {
    return 'Location is required and must be 160 characters or fewer.';
  }

  if (!isValidEventDate(body.eventDate)) {
    return 'Enter a valid event date in YYYY-MM-DD format.';
  }

  return null;
}

// GET ALL REPORTS
router.get('/', async (request, response, next) => {
  try {
    const { type, search } = request.query;

    let sql = `
      SELECT
        r.id,
        r.report_type,
        r.title,
        r.description,
        r.category,
        r.location,
        r.event_date,
        r.status,
        r.created_at,
        u.full_name AS reporter_name
      FROM reports r
      JOIN users u ON r.reporter_id = u.id
      WHERE r.status <> 'CLOSED'
    `;

    const values = [];

    if (type && ['LOST', 'FOUND'].includes(type.toUpperCase())) {
      sql += ' AND r.report_type = ?';
      values.push(type.toUpperCase());
    }

    if (search && String(search).trim()) {
      sql += `
        AND (
          r.title LIKE ?
          OR r.category LIKE ?
          OR r.location LIKE ?
        )
      `;

      const term = `%${String(search).trim()}%`;
      values.push(term, term, term);
    }

    sql += ' ORDER BY r.created_at DESC';

    const [reports] = await database.execute(sql, values);

    return response.json({ reports });
  } catch (error) {
    return next(error);
  }
});

// GET REPORTS CREATED BY THE AUTHENTICATED USER
router.get('/mine', async (request, response, next) => {
  try {
    const [reports] = await database.execute(
      `
        SELECT
          id,
          report_type,
          title,
          description,
          category,
          location,
          event_date,
          status,
          created_at
        FROM reports
        WHERE reporter_id = ?
        ORDER BY created_at DESC
      `,
      [request.user.id]
    );

    return response.json({ reports });
  } catch (error) {
    return next(error);
  }
});

// GET AN OWNED REPORT FOR EDITING
router.get('/:id/edit', async (request, response, next) => {
  const reportId = isValidReportId(request.params.id);

  if (!reportId) {
    return response.status(400).json({
      message: 'Invalid report ID.'
    });
  }

  try {
    const [reports] = await database.execute(
      `
        SELECT
          id,
          report_type,
          title,
          description,
          category,
          location,
          event_date,
          status
        FROM reports
        WHERE id = ? AND reporter_id = ?
        LIMIT 1
      `,
      [reportId, request.user.id]
    );

    if (!reports.length) {
      return response.status(404).json({
        message: 'Report not found.'
      });
    }

    const report = reports[0];

    if (report.status !== 'OPEN') {
      return response.status(409).json({
        message: 'Only open reports can be edited.'
      });
    }

    const [activeClaims] = await database.execute(
      `
        SELECT id
        FROM claims
        WHERE report_id = ? AND status IN ('PENDING', 'APPROVED')
        LIMIT 1
      `,
      [reportId]
    );

    if (activeClaims.length) {
      return response.status(409).json({
        message: 'Reports with pending or approved claims cannot be edited.'
      });
    }

    delete report.status;

    if (report.report_type === 'FOUND') {
      const [privateDetails] = await database.execute(
        `
          SELECT identifying_details
          FROM report_private_details
          WHERE report_id = ?
          LIMIT 1
        `,
        [reportId]
      );

      report.identifying_details = privateDetails[0]?.identifying_details ?? '';
    }

    return response.json({ report });
  } catch (error) {
    return next(error);
  }
});

// GET ONE REPORT
router.get('/:id', async (request, response, next) => {
  try {
    const reportId = Number(request.params.id);

    if (!Number.isSafeInteger(reportId) || reportId < 1) {
      return response.status(400).json({
        message: 'Invalid report ID.'
      });
    }

    const [reports] = await database.execute(
      `
        SELECT
          r.id,
          r.report_type,
          r.title,
          r.description,
          r.category,
          r.location,
          r.event_date,
          r.status,
          r.created_at,
          u.full_name AS reporter_name
        FROM reports r
        JOIN users u ON r.reporter_id = u.id
        WHERE r.id = ?
        LIMIT 1
      `,
      [reportId]
    );

    if (!reports.length) {
      return response.status(404).json({
        message: 'Report not found.'
      });
    }

    return response.json({ report: reports[0] });
  } catch (error) {
    return next(error);
  }
});

// UPDATE AN OWNED OPEN REPORT
router.put('/:id', async (request, response, next) => {
  const reportId = isValidReportId(request.params.id);

  if (!reportId) {
    return response.status(400).json({
      message: 'Invalid report ID.'
    });
  }

  const validationError = validateReportUpdate(request.body);

  if (validationError) {
    return response.status(400).json({ message: validationError });
  }

  let connection;

  try {
    connection = await database.getConnection();
    await connection.beginTransaction();

    const [reports] = await connection.execute(
      `
        SELECT report_type, status
        FROM reports
        WHERE id = ? AND reporter_id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [reportId, request.user.id]
    );

    if (!reports.length) {
      await connection.rollback();
      return response.status(404).json({
        message: 'Report not found.'
      });
    }

    const report = reports[0];

    if (report.status !== 'OPEN') {
      await connection.rollback();
      return response.status(409).json({
        message: 'Only open reports can be edited.'
      });
    }

    const [activeClaims] = await connection.execute(
      `
        SELECT id
        FROM claims
        WHERE report_id = ? AND status IN ('PENDING', 'APPROVED')
        LIMIT 1
        FOR UPDATE
      `,
      [reportId]
    );

    if (activeClaims.length) {
      await connection.rollback();
      return response.status(409).json({
        message: 'Reports with pending or approved claims cannot be edited.'
      });
    }

    const suppliedReportTypes = [request.body.reportType, request.body.report_type]
      .filter((value) => value !== undefined);

    if (suppliedReportTypes.some((value) => value !== report.report_type)) {
      await connection.rollback();
      return response.status(400).json({
        message: 'Report type cannot be changed after creation.'
      });
    }

    if (
      report.report_type === 'FOUND' &&
      (typeof request.body.identifyingDetails !== 'string' ||
        !request.body.identifyingDetails.trim())
    ) {
      await connection.rollback();
      return response.status(400).json({
        message: 'Private identifying details are required for found reports.'
      });
    }

    await connection.execute(
      `
        UPDATE reports
        SET title = ?, description = ?, category = ?, location = ?, event_date = ?
        WHERE id = ? AND reporter_id = ? AND status = 'OPEN'
      `,
      [
        request.body.title.trim(),
        request.body.description.trim(),
        request.body.category.trim(),
        request.body.location.trim(),
        request.body.eventDate,
        reportId,
        request.user.id
      ]
    );

    if (report.report_type === 'FOUND') {
      await connection.execute(
        `
          INSERT INTO report_private_details (report_id, identifying_details)
          VALUES (?, ?)
          ON DUPLICATE KEY UPDATE identifying_details = VALUES(identifying_details)
        `,
        [reportId, request.body.identifyingDetails.trim()]
      );
    }

    await connection.commit();

    return response.json({
      message: 'Report updated successfully.',
      reportId
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        // Preserve the original operation error for Express.
      }
    }
    return next(error);
  } finally {
    connection?.release();
  }
});

// CREATE A LOST OR FOUND REPORT
router.post('/', async (request, response, next) => {
  const {
    reportType,
    title,
    description,
    category,
    location,
    eventDate,
    identifyingDetails
  } = request.body;

  const allowedTypes = ['LOST', 'FOUND'];

  if (!allowedTypes.includes(reportType)) {
    return response.status(400).json({
      message: 'Report type must be LOST or FOUND.'
    });
  }

  if (
    typeof title !== 'string' ||
    title.trim().length < 3 ||
    title.trim().length > 140
  ) {
    return response.status(400).json({
      message: 'Title must be between 3 and 140 characters.'
    });
  }

  if (
    typeof description !== 'string' ||
    !description.trim() ||
    typeof category !== 'string' ||
    !category.trim() ||
    typeof location !== 'string' ||
    !location.trim()
  ) {
    return response.status(400).json({
      message: 'Description, category and location are required.'
    });
  }

  if (exceedsMysqlTextLimit(description)) {
    return response.status(400).json({
      message: 'Description must be 65,535 UTF-8 bytes or fewer.'
    });
  }

  if (!isValidEventDate(eventDate)) {
    return response.status(400).json({
      message: 'Enter a valid event date in YYYY-MM-DD format.'
    });
  }

  if (
    reportType === 'FOUND' &&
    (typeof identifyingDetails !== 'string' || !identifyingDetails.trim())
  ) {
    return response.status(400).json({
      message: 'Private identifying details are required for found reports.'
    });
  }

  if (
    reportType === 'FOUND' &&
    exceedsMysqlTextLimit(identifyingDetails)
  ) {
    return response.status(400).json({
      message: 'Private identifying details must be 65,535 UTF-8 bytes or fewer.'
    });
  }

  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `
        INSERT INTO reports (
          reporter_id,
          report_type,
          title,
          description,
          category,
          location,
          event_date
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        request.user.id,
        reportType,
        title.trim(),
        description.trim(),
        category.trim(),
        location.trim(),
        eventDate
      ]
    );

    if (reportType === 'FOUND') {
      await connection.execute(
        `
          INSERT INTO report_private_details (
            report_id,
            identifying_details
          )
          VALUES (?, ?)
        `,
        [result.insertId, identifyingDetails.trim()]
      );
    }

    await connection.commit();

    return response.status(201).json({
      message: 'Report created successfully.',
      reportId: result.insertId
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // Preserve the original operation error for Express.
    }
    return next(error);
  } finally {
    connection.release();
  }
});

export default router;
