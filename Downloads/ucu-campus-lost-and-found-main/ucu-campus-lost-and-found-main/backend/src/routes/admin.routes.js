import { Router } from 'express';

const router = Router();

router.all('*', (_request, response) => {
  response.status(501).json({ message: 'Administration endpoints are not implemented yet.' });
});

export default router;
