# Backend Server Configuration for Vercel

This document explains how to configure and deploy the SecureDove backend on Vercel.

## Backend Overview

The backend is an Express.js server with:
- REST API endpoints for authentication, contacts, conversations, and messages
- WebSocket support via Socket.IO for real-time messaging
- SQLite database (will need migration for production)
- CORS configuration for frontend communication
- Rate limiting and security headers

## Vercel Deployment Requirements

### Prerequisite: Enable WebSocket Support
⚠️ **Important**: WebSocket support (required for real-time chat) is only available on:
- Vercel Pro ($20/month)
- Vercel Enterprise

Free tier does NOT support WebSockets.

## Deployment Steps

### Step 1: Prepare Environment Variables

In your Vercel backend project settings, set these environment variables:

```env
# Essential
NODE_ENV=production
PORT=3000
JWT_SECRET=<generate-a-strong-random-secret-here>

# Database (SQLite)
DB_PATH=/tmp/securedove.db

# CORS - Set to your frontend URL
CORS_ORIGIN=https://your-frontend.vercel.app

# Rate Limiting (optional, can use defaults)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOGIN_RATE_LIMIT_WINDOW_MS=900000
LOGIN_RATE_LIMIT_MAX_REQUESTS=5
```

### Step 2: Generate JWT Secret

Create a strong random JWT secret:

**Option 1: Using Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Option 2: Using OpenSSL**
```bash
openssl rand -hex 32
```

Copy the output and paste it in Vercel as `JWT_SECRET`.

### Step 3: Configure Database Path

Since Vercel's file system is ephemeral (resets on each deployment):
- The `DB_PATH=/tmp/securedove.db` will work for testing
- **For production**: Migrate to PostgreSQL, MongoDB, or similar persistent database

### Step 4: Set CORS_ORIGIN

Replace `your-frontend.vercel.app` with your actual frontend URL from Vercel.

This prevents unauthorized cross-origin requests.

### Step 5: Deploy

Push to your GitHub repository connected to Vercel:
```bash
git push origin main
```

Vercel will automatically:
1. Run `npm run build` (our no-op script)
2. Run `npm start` to start the server
3. Display the deployment URL

## Health Check

After deployment, verify the server is running:

```bash
curl https://your-backend.vercel.app/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": 1634567890123,
  "environment": "production"
}
```

## Database Migration from SQLite to PostgreSQL

For production use with persistent data:

### Option 1: Use Vercel Postgres (Recommended for Vercel)

1. Add Vercel Postgres to your project
2. Update `server/config/database.js` to use PostgreSQL instead of SQLite
3. Update environment variables in Vercel
4. Run migrations

### Option 2: Use External Database

1. Create a PostgreSQL/MongoDB database (e.g., on AWS RDS, MongoDB Atlas)
2. Update connection string in environment variables
3. Migrate data
4. Update `server/config/database.js` to use the connection string

## CORS Configuration

The server is configured to accept requests from `CORS_ORIGIN` (your frontend URL).

**Current configuration** (in `server.js`):
```javascript
const CORS_ORIGIN = getEnv('CORS_ORIGIN', 'http://localhost:5173');

app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

Socket.IO also uses the same `CORS_ORIGIN` setting.

## Socket.IO WebSocket Configuration

The server uses Socket.IO for real-time messaging with:
- Automatic reconnection
- JWT authentication
- Conversation-based rooms
- Event-based communication

**Ensure your Vercel plan supports WebSockets:**
```bash
# Check in Vercel dashboard
Settings → Functions → WebSockets (Pro/Enterprise only)
```

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | Yes | 3000 | Server port (Vercel sets automatically) |
| `NODE_ENV` | Yes | development | Set to `production` on Vercel |
| `JWT_SECRET` | Yes | - | Secret key for JWT tokens |
| `DB_PATH` | No | ./database/securedove.db | SQLite database path |
| `CORS_ORIGIN` | Yes | http://localhost:5173 | Frontend URL for CORS |
| `RATE_LIMIT_WINDOW_MS` | No | 900000 | Rate limit window in milliseconds |
| `RATE_LIMIT_MAX_REQUESTS` | No | 100 | Max requests per window |
| `LOGIN_RATE_LIMIT_WINDOW_MS` | No | 900000 | Login rate limit window |
| `LOGIN_RATE_LIMIT_MAX_REQUESTS` | No | 5 | Max login attempts per window |

## Security Checklist

- [ ] JWT_SECRET is strong and random (not default)
- [ ] NODE_ENV is set to `production`
- [ ] CORS_ORIGIN matches frontend URL exactly
- [ ] Rate limiting is configured appropriately
- [ ] HTTPS is enabled (Vercel provides this by default)
- [ ] Database path is set to `/tmp` or persistent storage
- [ ] No sensitive data in `.env` files committed to Git

## Troubleshooting

### 500 Error on Health Check

**Problem**: `curl https://your-backend.vercel.app/health` returns 500

**Solution**:
- Check Vercel logs: `vercel logs`
- Verify all environment variables are set
- Ensure Node.js version is 18+

### CORS Error in Frontend

**Problem**: Frontend console shows CORS error

**Solution**:
- Verify `CORS_ORIGIN` matches frontend URL exactly (include protocol and domain)
- Redeploy after changing environment variables
- Check frontend URL in Vercel → Settings

### WebSocket Connection Failed

**Problem**: Real-time chat not working

**Solution**:
- Verify you have Vercel Pro/Enterprise (WebSocket requirement)
- Check that `VITE_SOCKET_URL` in frontend matches backend URL
- Review Vercel logs for Socket.IO errors
- Ensure authentication token is valid

### Database Errors

**Problem**: Database errors in logs

**Solution**:
- For SQLite: Ensure `/tmp` directory is writable
- For production: Migrate to PostgreSQL/MongoDB
- Run `npm run verify-db` locally to check database integrity

### Port Already in Use

**Problem**: "Port 3000 already in use"

**Solution**:
- Vercel manages port assignment automatically
- Check for conflicting processes locally: `lsof -i :3000`
- This shouldn't occur on Vercel (it handles port management)

## Local Testing Before Deployment

```bash
# Install dependencies
cd server
npm install

# Set environment variables
export NODE_ENV=production
export JWT_SECRET=test-secret-do-not-use
export DB_PATH=./database/test.db
export CORS_ORIGIN=http://localhost:3000

# Initialize database
npm run init-db

# Start server
npm start

# In another terminal, test health endpoint
curl http://localhost:3000/health
```

## Monitoring and Logs

View deployment logs in Vercel:
```bash
# Install Vercel CLI
npm install -g vercel

# View logs
vercel logs
```

Or view directly in Vercel dashboard:
Settings → Deployments → View Logs

## Next Steps

1. ✅ Server is configured for Vercel deployment
2. ✅ CORS and Socket.IO settings are in place
3. ⏭️ Set environment variables in Vercel
4. ⏭️ Deploy backend to Vercel
5. ⏭️ Note backend URL
6. ⏭️ Set frontend's `VITE_API_URL` and `VITE_SOCKET_URL` in Vercel
7. ⏭️ Deploy frontend

## Additional Resources

- Express.js Documentation: https://expressjs.com/
- Socket.IO Documentation: https://socket.io/docs/
- Vercel Functions Documentation: https://vercel.com/docs/functions/serverless-functions
- CORS Documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS

