import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { apiLimiter } from './middleware/rateLimiter.js';
import { ensureDatabaseIntegrity } from './utils/databaseVerification.js';

// Import routes
import authRoutes from './routes/auth.js';
import contactsRoutes from './routes/contacts.js';
import conversationsRoutes from './routes/conversations.js';
import messagesRoutes from './routes/messages.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const isDevelopment = process.env.NODE_ENV === 'development';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// Request logging in development
if (isDevelopment) {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    environment: process.env.NODE_ENV 
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/messages', messagesRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  // Don't leak error details in production
  const message = isDevelopment ? err.message : 'Internal server error';
  const stack = isDevelopment ? err.stack : undefined;
  
  res.status(err.status || 500).json({
    error: message,
    ...(stack && { stack })
  });
});

// Start server with database verification
async function startServer() {
  try {
    // Verify/initialize database before starting server
    await ensureDatabaseIntegrity();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════╗
║     SecureDove Server Started          ║
╠════════════════════════════════════════╣
║  Port: ${PORT.toString().padEnd(32)}  ║
║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(23)}  ║
║  CORS Origin: ${(process.env.CORS_ORIGIN || 'http://localhost:5173').padEnd(23)}  ║
╚════════════════════════════════════════╝
      `);
      
      if (isDevelopment) {
        console.log('API Endpoints:');
        console.log('  POST   /api/auth/register');
        console.log('  POST   /api/auth/login');
        console.log('  GET    /api/auth/user');
        console.log('  POST   /api/auth/logout');
        console.log('  GET    /api/auth/check-username/:username');
        console.log('  POST   /api/contacts');
        console.log('  GET    /api/contacts');
        console.log('  DELETE /api/contacts/:contactId');
        console.log('  GET    /api/contacts/:username/public-key');
        console.log('  POST   /api/conversations');
        console.log('  GET    /api/conversations');
        console.log('  GET    /api/conversations/:conversationId');
        console.log('  DELETE /api/conversations/:conversationId');
        console.log('  POST   /api/messages');
        console.log('  GET    /api/messages/:conversationId');
        console.log('  PUT    /api/messages/:messageId');
        console.log('  DELETE /api/messages/:messageId');
        console.log('  GET    /api/messages/recent/all');
        console.log('');
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Start the server
startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export default app;
