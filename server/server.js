import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import { apiLimiter } from './middleware/rateLimiter.js';
import { ensureDatabaseIntegrity } from './utils/databaseVerification.js';
import { verifyToken } from './utils/auth.js';
import authRoutes from './routes/auth.js';
import contactsRoutes from './routes/contacts.js';
import conversationsRoutes from './routes/conversations.js';
import messagesRoutes from './routes/messages.js';
import { getEnv } from './config/env.js';

const app = express();
const httpServer = createServer(app);
const nodeEnv = getEnv('NODE_ENV', 'development');
const isDevelopment = nodeEnv === 'development';
const PORT = Number.parseInt(getEnv('PORT', 3000), 10);

// CORS origin can be a single origin or comma-separated list of origins
const corsOriginEnv = getEnv('CORS_ORIGIN', 'http://localhost:5173');
const CORS_ORIGINS = corsOriginEnv.includes(',')
  ? corsOriginEnv.split(',').map(origin => origin.trim())
  : corsOriginEnv;

// CORS configuration function to handle multiple origins
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = Array.isArray(CORS_ORIGINS) ? CORS_ORIGINS : [CORS_ORIGINS];

    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 86400 // 24 hours
};

const io = new Server(httpServer, {
  cors: {
    origin: corsOptions.origin,
    credentials: true,
    methods: ['GET', 'POST']
  }
});
app.set('io', io);

// Helmet configuration - disable CSP in production for better Vercel compatibility
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP to avoid conflicts with CORS and Vercel
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
}));

app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api', apiLimiter);

if (isDevelopment) {
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Middleware to log CORS info for debugging
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    console.log(`Request from origin: ${origin}`);
  }
  next();
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now(), environment: nodeEnv });
});

// CORS test endpoint
app.get('/api/cors-test', (req, res) => {
  res.json({
    message: 'CORS is working!',
    origin: req.headers.origin || 'No origin header',
    allowedOrigins: Array.isArray(CORS_ORIGINS) ? CORS_ORIGINS : [CORS_ORIGINS],
    timestamp: Date.now()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/messages', messagesRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, _req, res, _next) => {
  const message = isDevelopment ? err.message : 'Internal server error';
  const stack = isDevelopment ? err.stack : undefined;
  res.status(err.status || 500).json({ error: message, ...(stack && { stack }) });
});

io.on('connection', (socket) => {
  socket.on('authenticate', (token) => {
    try {
      const { userId, username } = verifyToken(token);
      socket.userId = userId;
      socket.username = username;
      socket.join(`user:${username}`);
      socket.emit('authenticated', { success: true });
    } catch {
      socket.emit('authenticated', { success: false, error: 'Invalid token' });
      socket.disconnect();
    }
  });

  socket.on('join-conversation', (conversationId) => {
    if (socket.username) socket.join(`conversation:${conversationId}`);
  });

  socket.on('leave-conversation', (conversationId) => {
    if (socket.username) socket.leave(`conversation:${conversationId}`);
  });
});

async function startServer() {
  try {
    await ensureDatabaseIntegrity();
    // Only start server if not in Vercel serverless environment
    if (!process.env.VERCEL) {
      httpServer.listen(PORT, () => {
        console.log(`SecureDove running on port ${PORT} (${nodeEnv})`);
      });
    }
  } catch (error) {
    console.error('Failed to start server:', error.message);
    if (!process.env.VERCEL) {
      process.exit(1);
    }
  }
}

// Initialize database
startServer();

process.on('SIGTERM', () => {
  httpServer.close(() => process.exit(0));
});

// Export for Vercel serverless
export default app;
export { io };
