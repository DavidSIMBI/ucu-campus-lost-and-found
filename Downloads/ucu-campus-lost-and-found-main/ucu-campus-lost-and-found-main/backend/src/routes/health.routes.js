import { Router } from 'express';

const router = Router();

router.get('/', (_request, response) => {
  response.status(200).json({ status: 'ok', message: 'UCU Lost and Found API is running.' });
});

export default router;
