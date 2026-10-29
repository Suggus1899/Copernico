import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import hpp from 'hpp';
import mongoSanitize from 'express-mongo-sanitize';
import { config } from './config.js';
import { databaseReadiness, pingDatabase } from './database.js';
import { globalLimiter } from './middlewares/rateLimiters.js';
import { originCheck } from './middlewares/originCheck.js';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import notesRoutes from './routes/notes.routes.js';
import appointmentRoutes from './routes/appointment.routes.js';
import educationalMaterialRoutes from './routes/educationalMaterial.routes.js';
import classVideoRoutes from './routes/classVideo.routes.js';
import progressTrackingRoutes from './routes/progressTracking.routes.js';
import videoProgressRoutes from './routes/videoProgress.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import messageRoutes from './routes/message.routes.js';

// Las rutas de assignments y reports quedan fuera de la API publicada (funcionalidad experimental).

const app = express();

// Detrás de Render/Vercel la IP real llega en X-Forwarded-For; TRUST_PROXY indica cuántos saltos confiar.
app.set('trust proxy', config.TRUST_PROXY);

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => callback(null, !origin || config.FRONTEND_ORIGINS.includes(origin)),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  maxAge: 600,
}));
app.use(globalLimiter);
app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: true, limit: '200kb' }));
app.use(cookieParser());
if (config.NODE_ENV !== 'test') app.use(morgan('dev'));
app.use(mongoSanitize());
app.use(hpp());

// Las respuestas dependen de la sesión: nunca deben cachearse.
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use('/api', originCheck);

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/materials', educationalMaterialRoutes);
app.use('/api/videos', classVideoRoutes);
app.use('/api/progress', progressTrackingRoutes);
app.use('/api/video-progress', videoProgressRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);

// Liveness: el proceso responde.
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok' });
});

// Readiness: solo listo para tráfico si MongoDB responde.
app.get('/api/health/ready', async (req, res) => {
  let ready = databaseReadiness();
  if (ready) {
    try {
      await pingDatabase();
    } catch {
      ready = false;
    }
  }
  res.status(ready ? 200 : 503).json({ success: ready, status: ready ? 'ready' : 'unavailable' });
});

app.get('/', (req, res) => {
  res.json({ name: 'copernico-api', health: '/api/health' });
});

// Evita el 404 del favicon en navegadores.
app.get('/favicon.ico', (req, res) => res.sendStatus(204));

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
