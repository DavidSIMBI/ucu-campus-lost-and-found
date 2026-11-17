import { Router } from 'express';

const router = Router();

router.all('*', (_request, response) => {
  response.status(501).json({ message: 'Authentication endpoints are not implemented yet.' });
});

export default router;
