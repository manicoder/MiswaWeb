# 🚂 Railway Quick Start Checklist

## Pre-Deployment Checklist

- [ ] Code is pushed to GitHub
- [ ] Railway account created
- [ ] No MongoDB account needed - Railway provides it!

---

## Quick Steps

### 1. Railway Project & MongoDB (3 minutes)
- [ ] Create new Railway project
- [ ] Click "New" → "Database" → "MongoDB"
- [ ] Wait for MongoDB to deploy (1-2 minutes)
- [ ] Railway automatically creates `MONGO_URL` variable

### 2. Backend Service (5 minutes)
- [ ] Add new service from GitHub
- [ ] Set Root Directory: `backend`
- [ ] Set Start Command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
- [ ] Add Environment Variables:
  - `MONGO_URL` = (automatically available from MongoDB service - check Variables tab)
  - `DB_NAME` = `miswa_international`
  - `CORS_ORIGINS` = (will update after frontend)
- [ ] Copy backend URL

### 3. Frontend Service (5 minutes)
- [ ] Add new service from GitHub
- [ ] Set Root Directory: `frontend`
- [ ] Set Build Command: `yarn install && yarn build`
- [ ] Set Start Command: `yarn serve` (or leave empty, Railway uses Procfile)
- [ ] Add Environment Variable:
  - `REACT_APP_BACKEND_URL` = (your backend Railway URL)
- [ ] Copy frontend URL

### 4. Final Configuration (2 minutes)
- [ ] Update backend `CORS_ORIGINS` with frontend URL
- [ ] Test backend at: `https://your-backend.railway.app/docs`
- [ ] Test frontend at: `https://your-frontend.railway.app`

---

## Environment Variables Summary

### Backend
```
MONGO_URL (auto-provided by Railway MongoDB service)
DB_NAME=miswa_international
CORS_ORIGINS=https://your-frontend.railway.app
PORT (auto-provided by Railway)
```

### Frontend
```
REACT_APP_BACKEND_URL=https://your-backend.railway.app
PORT (auto-provided by Railway)
```

---

## Common Issues

| Problem | Solution |
|---------|----------|
| Backend won't start | Check that MongoDB service is running, verify MONGO_URL is available |
| CORS errors | Update CORS_ORIGINS in backend |
| Frontend blank page | Check REACT_APP_BACKEND_URL |
| Build fails | Check logs, verify dependencies |
| MongoDB not connecting | Ensure MongoDB service is in same project as backend |

---

## Test URLs

After deployment, test these:
- Backend API Docs: `https://your-backend.railway.app/docs`
- Backend Brands: `https://your-backend.railway.app/api/brands`
- Frontend: `https://your-frontend.railway.app`

---

📖 **Full detailed guide**: See `RAILWAY_DEPLOYMENT.md`

