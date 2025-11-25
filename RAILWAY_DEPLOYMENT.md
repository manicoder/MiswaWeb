# Railway Deployment Guide for miswainternational.com

This guide explains how to deploy the MLT Admin application to Railway with the custom domain `miswainternational.com` and serve it at the `/admin` path.

## Overview

The application will be accessible at:
- **Frontend**: `https://miswainternational.com/admin`
- **Backend API**: Configured via Railway environment variables

## Prerequisites

1. Railway account
2. Domain `miswainternational.com` configured and pointing to Railway
3. Two Railway services:
   - Frontend service (MltAdminWeb)
   - Backend service (MltAdminApi)

## Configuration Changes Made

### Frontend (MltAdminWeb)

1. **Vite Base Path**: Set to `/admin/` in `vite.config.ts`
2. **React Router Basename**: Dynamically set to `/admin` when running on `miswainternational.com`
3. **Health Check Path**: Updated to `/admin/` in `railway.json`
4. **Environment Detection**: Added `isMiswainternational` flag

### Backend (MltAdminApi)

1. **CORS Configuration**: Added `https://miswainternational.com` to allowed origins
2. **Origin Validation**: Added check for `miswainternational.com` domain

## Railway Setup Steps

### 1. Create Railway Services

Create two separate services in Railway:
- **MltAdminWeb** (Frontend)
- **MltAdminApi** (Backend)

### 2. Configure Frontend Service (MltAdminWeb)

1. Connect your repository to Railway
2. Set the root directory to `MltAdminWeb`
3. Railway will automatically detect the `railway.json` configuration

**Environment Variables:**
```bash
VITE_API_URL=https://your-api-service.railway.app/api
PORT=4173
```

### 3. Configure Backend Service (MltAdminApi)

1. Connect your repository to Railway
2. Set the root directory to `MltAdminApi`
3. Railway will use the Dockerfile for building

**Required Environment Variables:**
```bash
# Database
DB_HOST=your-db-host
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASSWORD=your-db-password

# JWT
JWT_KEY=your-jwt-secret-key

# Encryption
ENCRYPTION_KEY=your-encryption-key

# MailerSend (optional)
MAILERSEND_SMTP_USERNAME=your-username
MAILERSEND_SMTP_PASSWORD=your-password
MAILERSEND_FROM_EMAIL=noreply@mylittletales.com
MAILERSEND_FROM_NAME=MLT Admin

# SuperAdmin (optional, defaults to admin@mylittletales.com / TempPassword123!)
SUPERADMIN_EMAIL=admin@mylittletales.com
SUPERADMIN_PASSWORD=your-secure-password

# Frontend URL for CORS
FRONTEND_URL=https://miswainternational.com
```

### 4. Configure Custom Domain

1. In Railway, go to your **MltAdminWeb** service
2. Navigate to **Settings** → **Networking**
3. Add custom domain: `miswainternational.com`
4. Configure DNS records as instructed by Railway:
   - Add a CNAME record pointing to Railway's provided domain
   - Or add an A record with Railway's IP address

### 5. Update Frontend Environment Variable

After the backend service is deployed, update the frontend's `VITE_API_URL`:
```bash
VITE_API_URL=https://your-backend-service.railway.app/api
```

## Deployment

1. Push your changes to the repository
2. Railway will automatically build and deploy both services
3. The frontend will be accessible at `https://miswainternational.com/admin`

## Verification

1. Visit `https://miswainternational.com/admin`
2. You should see the login page
3. Check browser console for any CORS or routing errors
4. Verify API calls are going to the correct backend URL

## Troubleshooting

### Issue: 404 errors on routes
- **Solution**: Ensure Vite base path is set to `/admin/` and React Router basename is `/admin`

### Issue: CORS errors
- **Solution**: Verify `miswainternational.com` is added to allowed origins in `Program.cs`
- Check that `FRONTEND_URL` environment variable is set correctly

### Issue: Assets not loading
- **Solution**: Ensure all asset paths use relative paths or the `/admin/` base path

### Issue: API calls failing
- **Solution**: Verify `VITE_API_URL` is set correctly in the frontend service
- Check that the backend service is running and accessible

## Notes

- The application automatically detects the domain and sets the basename accordingly
- For local development, the basename remains `/` (root)
- The health check path is set to `/admin/` for Railway monitoring
- All routes will be prefixed with `/admin` when accessed via `miswainternational.com`

