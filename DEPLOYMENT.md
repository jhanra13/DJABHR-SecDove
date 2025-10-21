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

### Option 1: Deploy Both Frontend and Backend

#### Step 1: Frontend Deployment
1. Connect your GitHub repository to Vercel
2. Select the project
3. Configure build settings:
   - **Framework**: Vite
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Environment Variables**: Add `VITE_API_URL` and `VITE_SOCKET_URL`
4. Deploy

#### Step 2: Backend Deployment
1. Create a new Vercel project for the backend
2. Configure build settings:
   - **Root Directory**: `server`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
3. Set environment variables:
   - `PORT` (Vercel sets this automatically, but good to document)
   - `NODE_ENV=production`
   - `JWT_SECRET` (use a strong secret)
   - `DB_PATH` (SQLite path, consider using `/tmp` for ephemeral storage)
   - `CORS_ORIGIN` (set to your frontend URL)
   - `RATE_LIMIT_WINDOW_MS`
   - `RATE_LIMIT_MAX_REQUESTS`
   - `LOGIN_RATE_LIMIT_WINDOW_MS`
   - `LOGIN_RATE_LIMIT_MAX_REQUESTS`
4. Deploy

### Option 2: Deploy with Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Log in to Vercel
vercel login

# Deploy from root directory
vercel
```

Follow the prompts and configure settings as needed.

## Environment Variables for Production

Update the following in your Vercel project settings:

**Server (.env)**
```
PORT=3000
NODE_ENV=production
JWT_SECRET=<generate-a-strong-random-secret>
DB_PATH=./database/securedove.db
CORS_ORIGIN=https://your-frontend-url.vercel.app
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOGIN_RATE_LIMIT_WINDOW_MS=900000
LOGIN_RATE_LIMIT_MAX_REQUESTS=5
```

**Client (.env.production)**
```
VITE_API_URL=https://your-backend-url.vercel.app/api
VITE_SOCKET_URL=https://your-backend-url.vercel.app
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

## Further Documentation
See `/documentation` folder for architecture, design, and implementation details.

