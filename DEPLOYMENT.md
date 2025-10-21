# Deployment Guide for SecureDove

## Prerequisites
- Node.js LTS (v18+)
- npm (v9+)
- Vercel account (for Vercel deployment)

## Project Structure
This is a monorepo with two main applications:
- **Server**: Express.js backend (Node.js)
- **Client**: React + Vite frontend

## Build Scripts

### Server Build
```bash
cd server
npm run build
npm start
```

The server build script is a no-op (no compilation needed) but required by Vercel.

### Client Build
```bash
cd client
npm run build
```

This generates optimized production files in `client/dist/`.

### Full Project Build
```bash
# From root directory
npm run build
```

This runs both server and client builds sequentially.

## Deployment to Vercel

### ⚠️ Important: WebSocket Requirement
Real-time messaging requires **Vercel Pro or Enterprise** (paid plans) for WebSocket support.
Free tier will not support the chat functionality.

### Frontend-Backend Integration Checklist

Before deploying, ensure:
- [ ] Backend `CORS_ORIGIN` will match frontend URL
- [ ] Frontend `VITE_API_URL` and `VITE_SOCKET_URL` are configured
- [ ] Both projects are deployed to Vercel (or have accessible URLs)
- [ ] JWT_SECRET is set in backend environment
- [ ] WebSocket support is available on your Vercel plan

### Recommended Deployment Order

**Deploy backend first**, then frontend. This ensures the frontend has a URL to connect to.

### Step 1: Deploy Backend First

1. Create a new Vercel project from your repository
2. Select **Root Directory**: `server`
3. Configure build settings:
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
4. Add environment variables (see `server/SERVER_ENV_SETUP.md`):
   - `NODE_ENV=production`
   - `JWT_SECRET=<strong-random-secret>`
   - `DB_PATH=/tmp/securedove.db`
   - `CORS_ORIGIN=https://your-frontend-domain.vercel.app`
5. Deploy and note the backend URL (e.g., `https://securedove-backend.vercel.app`)

### Step 2: Deploy Frontend

1. Create a new Vercel project for the frontend
2. Select **Root Directory**: `client`
3. Configure build settings:
   - **Framework**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add environment variables (see `client/FRONTEND_ENV_SETUP.md`):
   - `VITE_API_URL=https://your-backend-url.vercel.app/api`
   - `VITE_SOCKET_URL=https://your-backend-url.vercel.app`
5. Deploy

### Option 2: Deploy with Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Log in to Vercel
vercel login

# Deploy backend first
cd server
vercel

# Note the backend URL, then deploy frontend
cd ../client
vercel env add VITE_API_URL https://your-backend-url.vercel.app/api
vercel env add VITE_SOCKET_URL https://your-backend-url.vercel.app
vercel
```

## Environment Variables for Production

### Backend Environment Variables

Set these in your Vercel backend project settings:

```env
# Required
NODE_ENV=production
JWT_SECRET=<generate-with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
CORS_ORIGIN=https://your-frontend-url.vercel.app

# Database
DB_PATH=/tmp/securedove.db

# Optional (use defaults if not changed)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOGIN_RATE_LIMIT_WINDOW_MS=900000
LOGIN_RATE_LIMIT_MAX_REQUESTS=5
```

**IMPORTANT**: 
- Replace `your-frontend-url.vercel.app` with your actual frontend URL from Vercel
- The backend reads `CORS_ORIGIN` and uses it to allow requests from the frontend

### Frontend Environment Variables

Set these in your Vercel frontend project settings:

```env
# These must match your backend URL exactly
VITE_API_URL=https://your-backend-url.vercel.app/api
VITE_SOCKET_URL=https://your-backend-url.vercel.app
```

**IMPORTANT**:
- Replace `your-backend-url.vercel.app` with your actual backend URL from Vercel
- The frontend uses these to know where to send API requests and WebSocket connections
- Include the full URL with https://

### How Frontend-Backend Integration Works

```
Frontend                              Backend
(client/)                           (server/)
     |                                   |
     |-- VITE_API_URL (REST calls) ------>|
     |-- VITE_SOCKET_URL (WebSocket) ----->|
     |                                     |
     |<-- Responses & Real-time events ---|
     |                                     |
     |-- CORS_ORIGIN checked by backend
     |   (validates request is from
     |    allowed frontend domain)
```

## Important Notes

### Database Persistence
SQLite databases on Vercel are ephemeral (they reset after each deployment). For production:
- Consider migrating to a persistent database (PostgreSQL, MongoDB, etc.)
- Or use a persistent file system solution
- Or accept that data won't persist across deployments (for testing/demo purposes)

### Security Checklist
- [ ] Set a strong `JWT_SECRET` in production
- [ ] Enable HTTPS (Vercel provides this by default)
- [ ] Set correct `CORS_ORIGIN` to prevent unauthorized cross-origin requests
- [ ] Review rate limiting settings for your use case
- [ ] Ensure `NODE_ENV=production` is set
- [ ] Never commit `.env` files to version control

### WebSocket Configuration
- Vercel supports WebSockets on Pro and Enterprise plans
- Socket.IO requires WebSocket support
- Ensure `CORS_ORIGIN` is correctly configured for real-time communication

## Troubleshooting

### Build Fails
1. Check build logs in Vercel dashboard
2. Ensure all dependencies are listed in `package.json`
3. Verify Node version compatibility
4. Try building locally first: `npm run build`

### Missing Build Script Error
✓ This is now resolved with the added `build` script in server/package.json

### Database Issues
- Check that `DB_PATH` is accessible
- For Vercel: Consider using the temporary `/tmp` directory
- Long-term: Migrate to persistent database

### CORS Errors
- Verify `CORS_ORIGIN` matches your frontend URL exactly
- Include protocol (https:// or http://)
- Verify WebSocket URL configuration

## Verification After Deployment

### Test Backend Connection

1. **Health Check**
   ```bash
   curl https://your-backend-url.vercel.app/health
   ```
   Expected response:
   ```json
   {"status":"ok","timestamp":1634567890123,"environment":"production"}
   ```

2. **Test in Browser Console**
   - Open your frontend in browser
   - Press F12 (Developer Tools)
   - Go to Network tab
   - Perform an action (login, send message, etc.)
   - Verify requests are going to your backend URL (not localhost)

3. **WebSocket Connection**
   - In browser console, type: `console.log('Socket connected:', window.io)`
   - Should show connection status
   - Check for any CORS or connection errors

### Common Integration Issues

**Issue: API calls still hitting localhost**
- Solution: Verify `VITE_API_URL` in Vercel environment variables
- Redeploy frontend after changing variables
- Clear browser cache (Ctrl+Shift+Delete)

**Issue: CORS error in browser**
- Solution: Check backend's `CORS_ORIGIN` matches frontend URL exactly
- Must include https://
- Redeploy backend after changing

**Issue: WebSocket connection fails**
- Solution: Verify Vercel Pro/Enterprise plan (WebSocket requirement)
- Check `VITE_SOCKET_URL` matches backend URL
- Review Vercel logs for errors

**Issue: Login fails but health check works**
- Solution: Verify JWT_SECRET is set in backend environment
- Check database is initialized
- Review backend logs in Vercel

## Local Testing Before Deployment

```bash
# Install all dependencies
npm install
cd server && npm install
cd ../client && npm install
cd ..

# Build the project
npm run build

# Test server build
cd server
npm run build
npm start

# In another terminal, test client build
cd client
npm run build
npm run preview
```

## Detailed Setup Guides

For more detailed information:
- **Backend Setup**: See `server/SERVER_ENV_SETUP.md`
- **Frontend Setup**: See `client/FRONTEND_ENV_SETUP.md`
- **Project Structure**: See `/documentation` folder

## Quick Reference URLs

After deployment, you'll have:
- **Backend API**: `https://your-backend-url.vercel.app/api`
- **WebSocket URL**: `https://your-backend-url.vercel.app`
- **Frontend**: `https://your-frontend-url.vercel.app`
- **Backend Health**: `https://your-backend-url.vercel.app/health`

These URLs are what you'll use in environment variables for frontend-backend integration.

