# Frontend Environment Configuration for Vercel

This document explains how to configure environment variables for the frontend deployment on Vercel.

## Environment Variables Setup

The frontend uses the following environment variables to connect to the backend:

- `VITE_API_URL`: REST API endpoint (e.g., `https://your-backend.vercel.app/api`)
- `VITE_SOCKET_URL`: WebSocket endpoint (e.g., `https://your-backend.vercel.app`)

## How to Set Up on Vercel

### Step 1: Deploy the Backend First
Ensure your backend is deployed to Vercel and note its URL (e.g., `https://securedove-server.vercel.app`).

### Step 2: In Vercel Dashboard for Frontend

1. Go to your frontend project settings
2. Navigate to **Environment Variables**
3. Add the following variables:

```
VITE_API_URL = https://securedove-server.vercel.app/api
VITE_SOCKET_URL = https://securedove-server.vercel.app
```

Replace `securedove-server.vercel.app` with your actual backend URL.

### Step 3: Redeploy

After adding environment variables, redeploy your frontend:
- Push a new commit to your repository, or
- Click "Redeploy" in Vercel dashboard

## Local Development

For local development, the `.env.development` file provides sensible defaults:

```
VITE_API_URL=http://localhost:8000/api
VITE_SOCKET_URL=http://localhost:8000
```

Run locally with:
```bash
npm run dev
```

## Production Build

When building for production:

```bash
npm run build
```

Vite will automatically use environment variables defined in:
1. `.env.production` (fallback defaults)
2. Vercel environment variables (override)

## Verifying the Connection

After deployment:

1. Open your frontend in a browser
2. Open Developer Tools (F12) → Network tab
3. Try logging in or performing an action that calls the backend
4. Verify API calls are going to your backend URL (not localhost)
5. Check WebSocket connection in Console for any errors

## Common Issues

### API Calls Still Going to localhost

**Problem**: API requests are still hitting `localhost:8000` after deployment

**Solution**:
- Verify `VITE_API_URL` is set correctly in Vercel
- Redeploy after changing environment variables
- Clear browser cache (Ctrl+Shift+Delete)
- Check browser DevTools Network tab to confirm correct URLs

### WebSocket Connection Fails

**Problem**: Real-time chat not working, WebSocket errors in console

**Solution**:
- Ensure backend is deployed on Vercel Pro or Enterprise (free tier doesn't support WebSockets)
- Verify `VITE_SOCKET_URL` matches backend URL exactly
- Check CORS configuration in backend's `server.js`
- Verify backend's `CORS_ORIGIN` matches frontend URL

### Build Fails on Vercel

**Problem**: `npm run build` fails during deployment

**Solution**:
- Check build logs in Vercel dashboard
- Ensure all dependencies are installed: `npm install`
- Verify Node version is 18+: `node --version`
- Test build locally: `npm run build`

## File Structure

```
client/
├── .env.development      # Local dev defaults
├── .env.production       # Production fallbacks
├── vite.config.js        # Build configuration
├── package.json          # Build scripts
└── src/
    ├── utils/
    │   └── api.js        # Uses VITE_API_URL
    └── context/
        └── WebSocketContext.jsx  # Uses VITE_SOCKET_URL
```

## Next Steps

1. ✅ Frontend environment files created (`.env.development`, `.env.production`)
2. ✅ Vite configuration updated for production builds
3. ⏭️ Deploy backend to Vercel
4. ⏭️ Note backend URL
5. ⏭️ Set frontend environment variables in Vercel dashboard
6. ⏭️ Redeploy frontend

