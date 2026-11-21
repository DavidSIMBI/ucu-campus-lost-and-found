import express from 'express';
import cors from 'cors';
import { REPORT_PHOTO_DIRECTORY } from './config/report-storage.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import reportRoutes from './routes/reports.routes.js';
import claimRoutes from './routes/claims.routes.js';
import adminRoutes from './routes/admin.routes.js';
import superAdminRoutes from './routes/super-admin.routes.js';
import { notFound, errorHandler } from './middleware/error-handler.js';

const app = express();
const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (allowedOrigins.length === 0 || allowedOrigins.includes('*')) {
  throw new Error('FRONTEND_ORIGIN must contain one or more explicit origins; wildcards are not allowed.');
}

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Authorization', 'Content-Type']
}));
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
app.use('/api/super-admin', superAdminRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
