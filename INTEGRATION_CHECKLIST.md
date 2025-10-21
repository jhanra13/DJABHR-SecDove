# Frontend-Backend Integration Checklist for Vercel Deployment

This checklist ensures your SecureDove frontend and backend are properly configured to work together on Vercel.

## Pre-Deployment Checklist

### ✅ Backend Preparation
- [ ] Server has `build` script in `package.json` ✓ (Already added)
- [ ] `server.js` has CORS configuration ✓ (Already configured)
- [ ] `server.js` has Socket.IO configuration ✓ (Already configured)
- [ ] Environment variables documented in `.env.example` ✓ (Already created)
- [ ] `SERVER_ENV_SETUP.md` guide created ✓ (Already created)

### ✅ Frontend Preparation
- [ ] Client has `build` script in `package.json` ✓ (Already configured)
- [ ] Uses `VITE_API_URL` environment variable ✓ (Already in `src/utils/api.js`)
- [ ] Uses `VITE_SOCKET_URL` environment variable ✓ (Already in `src/context/WebSocketContext.jsx`)
- [ ] `.env.development` created ✓ (Already created)
- [ ] `.env.production` created ✓ (Already created)
- [ ] `FRONTEND_ENV_SETUP.md` guide created ✓ (Already created)
- [ ] Vite config updated for production ✓ (Already updated)

### ✅ Project Root Setup
- [ ] Root `package.json` created ✓ (Already created)
- [ ] `.gitignore` created ✓ (Already created)
- [ ] `.vercelignore` created ✓ (Already created)
- [ ] `vercel.json` created ✓ (Already created)
- [ ] `DEPLOYMENT.md` created ✓ (Already created)

## Deployment Order

### Phase 1: Backend Deployment

**Step 1: Create Vercel Backend Project**
1. Go to https://vercel.com/new
2. Import your repository
3. Root Directory: `server`
4. Build Command: `npm run build`
5. Start Command: `npm start`

**Step 2: Set Backend Environment Variables**
In Vercel dashboard → Settings → Environment Variables:

```
NODE_ENV = production
JWT_SECRET = <generate-new-secret>
DB_PATH = /tmp/securedove.db
CORS_ORIGIN = https://your-frontend-domain.vercel.app
RATE_LIMIT_WINDOW_MS = 900000
RATE_LIMIT_MAX_REQUESTS = 100
LOGIN_RATE_LIMIT_WINDOW_MS = 900000
LOGIN_RATE_LIMIT_MAX_REQUESTS = 5
```

⚠️ **IMPORTANT**: Don't set `CORS_ORIGIN` yet if you don't know your frontend URL. You can update it later.

**Step 3: Deploy Backend**
- Click "Deploy"
- Wait for deployment to complete
- Note the URL: `https://your-backend-name.vercel.app`

**Step 4: Verify Backend**
```bash
curl https://your-backend-name.vercel.app/health
```

### Phase 2: Frontend Deployment

**Step 1: Create Vercel Frontend Project**
1. Go to https://vercel.com/new
2. Import your repository (same one)
3. Root Directory: `client`
4. Framework: `Vite`
5. Build Command: `npm run build`
6. Output Directory: `dist`

**Step 2: Set Frontend Environment Variables**
In Vercel dashboard → Settings → Environment Variables:

```
VITE_API_URL = https://your-backend-name.vercel.app/api
VITE_SOCKET_URL = https://your-backend-name.vercel.app
```

Replace `your-backend-name` with your actual backend deployment name.

**Step 3: Deploy Frontend**
- Click "Deploy"
- Wait for deployment to complete
- Note the URL: `https://your-frontend-name.vercel.app`

### Phase 3: Complete Backend Configuration

**Step 1: Update Backend CORS_ORIGIN**
1. Go to your backend project in Vercel
2. Settings → Environment Variables
3. Find `CORS_ORIGIN`
4. Change value from placeholder to: `https://your-frontend-name.vercel.app`
5. Save

**Step 2: Redeploy Backend**
1. Click "Deployments"
2. Find the most recent deployment
3. Click the three-dot menu
4. Select "Redeploy"

## How It Works

```
User opens frontend
        ↓
Frontend loads environment variables from Vercel
    VITE_API_URL = https://backend.vercel.app/api
    VITE_SOCKET_URL = https://backend.vercel.app
        ↓
Frontend makes REST API calls to VITE_API_URL
    Backend receives request
    Backend checks CORS_ORIGIN == frontend URL
    Backend processes request
    Backend responds
        ↓
Frontend establishes WebSocket via VITE_SOCKET_URL
    Backend accepts connection (CORS_ORIGIN validated)
    Backend authenticates user
    Real-time messaging works ✓
```

## Environment Variables Summary

### What the Frontend Needs to Know

**File**: `client/.env.production`
```env
VITE_API_URL=https://backend-url.vercel.app/api
VITE_SOCKET_URL=https://backend-url.vercel.app
```

**Where it's used**:
- `src/utils/api.js` - All REST API calls
- `src/context/WebSocketContext.jsx` - Real-time WebSocket connection

### What the Backend Needs to Know

**File**: `server/.env` (set in Vercel dashboard)
```env
CORS_ORIGIN=https://frontend-url.vercel.app
```

**How it's used**:
- `server.js` line 24-28 - Validates requests from frontend
- Allows only requests from this exact URL
- Rejects requests from other origins

## Testing the Integration

### After Both Are Deployed

**Test 1: API Connection**
1. Open frontend URL in browser: `https://frontend-name.vercel.app`
2. Open DevTools (F12) → Network tab
3. Click "Register" or "Login"
4. Watch Network tab
5. Verify requests go to: `https://backend-name.vercel.app/api/...`
6. NOT to `localhost` ❌

**Test 2: WebSocket Connection**
1. Login successfully (if API works)
2. Open DevTools → Console
3. Create or join a conversation
4. You should see WebSocket activity
5. Real-time messages should appear
6. No CORS errors should appear

**Test 3: Health Check**
```bash
curl https://backend-name.vercel.app/health
# Should return:
# {"status":"ok","timestamp":1234567890,"environment":"production"}
```

## Troubleshooting

### Frontend Returns 404 for API Calls

**Problem**: Requests go to `https://frontend-name.vercel.app/api/...` instead of backend

**Solution**:
1. Check `VITE_API_URL` in Vercel frontend settings
2. Must be exactly: `https://backend-name.vercel.app/api`
3. Redeploy frontend after changing
4. Clear browser cache

### CORS Error in Browser

**Problem**: Console shows: "Access to XMLHttpRequest blocked by CORS policy"

**Solution**:
1. Check backend's `CORS_ORIGIN` in Vercel
2. Must match frontend URL exactly
3. Must include `https://`
4. Redeploy backend after changing
5. Wait a few minutes for deployment

### WebSocket Connection Fails

**Problem**: Console shows WebSocket connection error

**Solution**:
1. Verify you have Vercel Pro/Enterprise (WebSocket requirement)
2. Check `VITE_SOCKET_URL` matches backend URL
3. Check backend `CORS_ORIGIN` is correct
4. Try redeploying backend

### Login Works But Chat Doesn't

**Problem**: Can login but messages don't sync

**Solution**:
1. Real-time requires WebSocket (Pro/Enterprise only)
2. Try refreshing page to sync messages via API
3. Check browser console for WebSocket errors
4. Verify both frontend and backend redeployed after env var changes

## After Everything Works

🎉 Your SecureDove app is now:
- ✅ Deployed on Vercel
- ✅ Frontend talking to Backend
- ✅ WebSocket real-time messaging working
- ✅ Ready for production use

## Quick Reference

| Item | Value |
|------|-------|
| Frontend URL | `https://your-frontend-name.vercel.app` |
| Backend URL | `https://your-backend-name.vercel.app` |
| Backend Health | `https://your-backend-name.vercel.app/health` |
| Frontend VITE_API_URL | `https://your-backend-name.vercel.app/api` |
| Frontend VITE_SOCKET_URL | `https://your-backend-name.vercel.app` |
| Backend CORS_ORIGIN | `https://your-frontend-name.vercel.app` |

## Additional Documentation

- **Server Setup Guide**: `server/SERVER_ENV_SETUP.md`
- **Client Setup Guide**: `client/FRONTEND_ENV_SETUP.md`
- **Full Deployment Guide**: `DEPLOYMENT.md`
- **Project Documentation**: `documentation/` folder

