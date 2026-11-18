
import { Router } from 'express';
import { database } from '../config/database.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

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
    await connection.rollback();
    return next(error);
  } finally {
    connection.release();
  }
});

export default router;
