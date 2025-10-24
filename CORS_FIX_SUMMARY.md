# CORS Fix Summary & Deployment Guide

## Critical Issues Found & Fixed

### 1. **CORS Middleware Bug in server.js** ✅ FIXED
**Problem:** Origin validation happened AFTER OPTIONS (preflight) requests returned, meaning all origins could pass preflight checks.

**Location:** `server/server.js` lines 62-96

**Fix Applied:** Moved origin validation BEFORE setting headers and returning for OPTIONS requests.

```javascript
// OLD (Broken):
// 1. Set headers for ANY origin
// 2. Return 204 for OPTIONS
// 3. Check origin (never reached for OPTIONS!)

// NEW (Fixed):
// 1. Check origin FIRST
// 2. Only set headers if origin is allowed
// 3. Return 204 for OPTIONS
```

### 2. **Vercel Serverless Functions Accepting All Origins** ✅ FIXED
**Problem:** All three Vercel API wrapper files were accepting requests from ANY origin without validation.

**Files Fixed:**
- `server/api/index.js`
- `server/api/socketio.js`
- `server/api/_health.js`

**Fix Applied:** Added origin validation that reads from `CORS_ORIGIN` environment variable and rejects disallowed origins with 403.

### 3. **API Folder Location Issue** ✅ FIXED
**Problem:** The `api/` folder was at the root level, but backend is deployed with root=`server/`, so Vercel couldn't find the API handlers.

**Fix Applied:**
- Moved `api/` folder to `server/api/`
- Moved `vercel.json` to `server/vercel.json`
- Updated import paths in API handlers (`../server/server.js` → `../server.js`)

### 4. **Missing Production Environment Files** ✅ CREATED
**Problem:** No production environment configuration for server.

**Fix Applied:** Created `server/.env.production` with production-ready settings.

## Files Changed

### Modified:
1. ✅ `server/server.js` - Fixed CORS middleware logic
2. ✅ `api/index.js` - Added origin validation
3. ✅ `api/socketio.js` - Added origin validation
4. ✅ `api/_health.js` - Added origin validation
5. ✅ `client/vite.config.js` - Fixed inconsistent fallback URLs
6. ✅ `server/.env` - Fixed CORS_ORIGIN port
7. ✅ `server/.env.example` - Removed secrets, added placeholders
8. ✅ `client/.env.example` - Added placeholders for URLs

### Created:
1. ✅ `server/.env.production` - Production environment template
2. ✅ `server/.env.example` - Server environment documentation
3. ✅ `client/.env` - Active client environment file
4. ✅ `client/.env.example` - Client environment documentation

### Removed:
1. ✅ `client/.env` (redundant, replaced with proper version)
2. ✅ Root `.env.example` (mixed server/client config)

## Deployment Instructions

### Step 1: Update Vercel Backend Environment Variables

Go to your backend Vercel project → Settings → Environment Variables and set:

```env
NODE_ENV=production
JWT_SECRET=<generate-strong-random-secret-here>
DB_PATH=/tmp/securedove.db
ALLOW_EPHEMERAL_DB=true
CORS_ORIGIN=https://secdove-frontend.vercel.app
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOGIN_RATE_LIMIT_WINDOW_MS=900000
LOGIN_RATE_LIMIT_MAX_REQUESTS=5
```

**CRITICAL:** Make sure `CORS_ORIGIN` exactly matches your frontend URL (case-sensitive, no trailing slash).

### Step 2: Deploy Backend Changes

```bash
# Commit the fixes
git add .
git commit -m "Fix CORS security vulnerabilities"
git push

# Vercel will auto-deploy
```

Wait for deployment to complete and verify at: `https://secdove-backend.vercel.app/health`

### Step 3: Update Vercel Frontend Environment Variables

Go to your frontend Vercel project → Settings → Environment Variables and set:

```env
VITE_API_URL=https://secdove-backend.vercel.app/api
VITE_SOCKET_URL=https://secdove-backend.vercel.app
```

### Step 4: Redeploy Frontend

Frontend will auto-redeploy when you push, or trigger manual redeploy in Vercel dashboard.

### Step 5: Verify CORS is Working

1. Open browser DevTools → Network tab
2. Navigate to your frontend: `https://secdove-frontend.vercel.app`
3. Try to register or login
4. Check for CORS errors - should be none!
5. Verify response headers include: `Access-Control-Allow-Origin: https://secdove-frontend.vercel.app`

## Testing Locally

### Start Backend:
```bash
cd server
npm run dev
# Runs on http://localhost:8000
```

### Start Frontend:
```bash
cd client
npm run dev
# Runs on http://localhost:5173
```

**Local CORS is configured to allow:** `http://localhost:5173`

## Security Improvements

### Before:
- ❌ Any origin could make OPTIONS requests and get CORS headers
- ❌ Vercel API wrappers accepted all origins
- ❌ Origin validation bypassed for preflight requests
- ❌ Potential CORS bypass vulnerability

### After:
- ✅ Only configured origins receive CORS headers
- ✅ Origin validation happens BEFORE setting headers
- ✅ Both Express middleware and Vercel wrappers validate origins
- ✅ 403 Forbidden returned for disallowed origins
- ✅ Supports multiple origins via comma-separated CORS_ORIGIN

## Multiple Origins Support

If you need to allow multiple origins (e.g., staging + production):

```env
CORS_ORIGIN=https://secdove-frontend.vercel.app,https://staging.secdove.com,http://localhost:5173
```

The system will automatically parse comma-separated origins and allow all of them.

## Troubleshooting

### Still getting CORS errors?

1. **Check environment variables are set in Vercel:**
   - Go to Vercel project → Settings → Environment Variables
   - Verify `CORS_ORIGIN` is set correctly
   - **Redeploy** after changing environment variables (they don't auto-apply)

2. **Verify exact URL match:**
   - CORS_ORIGIN must match EXACTLY (including https/http, no trailing slash)
   - Example: `https://secdove-frontend.vercel.app` (correct)
   - Example: `https://secdove-frontend.vercel.app/` (wrong - has trailing slash)
   - Example: `http://secdove-frontend.vercel.app` (wrong - http instead of https)

3. **Check browser console:**
   - Look for specific CORS error messages
   - Check which request is failing (preflight OPTIONS or actual request)

4. **Verify deployment:**
   - Make sure latest code is deployed
   - Check deployment logs in Vercel dashboard
   - Verify server/server.js includes the CORS fixes

### Still not working?

Check server logs in Vercel:
1. Go to backend project → Deployments → Latest deployment → Logs
2. Look for CORS warning messages: `CORS blocked request from origin: ...`
3. This tells you which origin is being blocked and why

## Environment File Reference

### Development (Local):
- **Server:** Uses `server/.env` with `CORS_ORIGIN=http://localhost:5173`
- **Client:** Uses `client/.env` or `client/.env.development` with `VITE_API_URL=http://localhost:8000/api`

### Production (Vercel):
- **Server:** Environment variables set in Vercel dashboard (uses `server/.env.production` as template)
- **Client:** Environment variables set in Vercel dashboard (uses `client/.env.production` as template)

## Next Steps

1. ✅ Deploy backend with fixes
2. ✅ Set CORS_ORIGIN in backend Vercel environment variables
3. ✅ Deploy frontend
4. ✅ Test registration/login flow
5. ✅ Verify no CORS errors in browser console
6. ✅ Test WebSocket connection (real-time messaging)

## Security Notes

- The CORS fixes prevent unauthorized origins from accessing your API
- Always use HTTPS in production (Vercel provides this automatically)
- Keep JWT_SECRET strong and secret
- Never commit `.env` files with real secrets (they're in `.gitignore`)
- The `.env.example` files are safe to commit (no secrets)
