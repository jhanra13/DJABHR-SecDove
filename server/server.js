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
const CORS_ORIGIN = getEnv('CORS_ORIGIN', 'http://localhost:5173');

const parseOrigins = (raw) => raw.split(',').map((origin) => origin.trim()).filter(Boolean);
const staticAllowedOrigins = new Set(parseOrigins(CORS_ORIGIN));

const corsOptionsDelegate = (req, callback) => {
  const requestOrigin = req.header('Origin');
  let allowOrigin = false;

  if (requestOrigin) {
    if (staticAllowedOrigins.has(requestOrigin)) {
      allowOrigin = requestOrigin;
    } else {
      try {
        const originURL = new URL(requestOrigin);
        const requestHost = req.headers.host?.split(':')[0];
        if (requestHost && originURL.hostname === requestHost) {
          allowOrigin = requestOrigin;
        }
      } catch {
        allowOrigin = false;
      }
    }
  }

  const corsOptions = {
    origin: allowOrigin || false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  };

  callback(null, corsOptions);
};

const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST']
  }
});
app.set('io', io);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:']
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
}));

app.use(cors(corsOptionsDelegate));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api', apiLimiter);

if (isDevelopment) {
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now(), environment: nodeEnv });
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
    httpServer.listen(PORT, () => {
      console.log(`SecureDove running on port ${PORT} (${nodeEnv})`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();

process.on('SIGTERM', () => {
  httpServer.close(() => process.exit(0));
});

export default app;
export { io };
