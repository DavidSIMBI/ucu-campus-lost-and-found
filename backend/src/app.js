import express from 'express';
import cors from 'cors';
import { REPORT_PHOTO_DIRECTORY } from './config/report-storage.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import reportRoutes from './routes/reports.routes.js';
import claimRoutes from './routes/claims.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { notFound, errorHandler } from './middleware/error-handler.js';

const app = express();
const allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: '100kb' }));
app.use(
  '/uploads/reports',
  express.static(REPORT_PHOTO_DIRECTORY, {
    dotfiles: 'deny',
    index: false,
    redirect: false,
    fallthrough: true,
    setHeaders(response) {
      response.setHeader('X-Content-Type-Options', 'nosniff');
    }
  })
);

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
