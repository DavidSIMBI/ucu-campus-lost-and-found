
import { Router } from 'express';
import { database } from '../config/database.js';
import {
  authenticate,
  adminOnly
} from '../middleware/auth.middleware.js';

const router = Router();

// Protect all admin routes
router.use(authenticate, adminOnly);

// GET ADMIN DASHBOARD STATISTICS
router.get('/dashboard', async (request, response, next) => {
  try {
    const [users] = await database.execute(
      'SELECT COUNT(*) AS total FROM users'
    );

    const [students] = await database.execute(
      "SELECT COUNT(*) AS total FROM users WHERE role = 'STUDENT'"
    );

    const [reports] = await database.execute(
      'SELECT COUNT(*) AS total FROM reports'
    );

    const [claims] = await database.execute(
      "SELECT COUNT(*) AS total FROM claims WHERE status = 'PENDING'"
    );

    const [lost] = await database.execute(
      "SELECT COUNT(*) AS total FROM reports WHERE report_type = 'LOST'"
    );

    const [found] = await database.execute(
      "SELECT COUNT(*) AS total FROM reports WHERE report_type = 'FOUND'"
    );

    return response.json({
      message: 'Admin dashboard statistics retrieved successfully.',
      statistics: {
        totalUsers: users[0].total,
        totalStudents: students[0].total,
        totalReports: reports[0].total,
        pendingClaims: claims[0].total,
        lostItems: lost[0].total,
        foundItems: found[0].total
      }
    });

  } catch (error) {
    next(error);
  }
});

export default router;
