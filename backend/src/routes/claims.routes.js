
import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// Require users to log in before accessing claims
router.use(authenticate);

// Claim endpoints will be implemented separately
router.all('*', (_request, response) => {
  return response.status(501).json({
    message: 'Claim endpoints are not implemented yet.'
  });
});

export default router;
