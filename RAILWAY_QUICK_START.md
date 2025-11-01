# 🚂 Railway Quick Start Checklist

## Pre-Deployment Checklist

- [ ] Code is pushed to GitHub
- [ ] MongoDB Atlas account created (or plan to use Railway MongoDB)
- [ ] Railway account created

---

## Quick Steps

### 1. MongoDB Setup (5 minutes)
- [ ] Create MongoDB Atlas cluster
- [ ] Create database user
- [ ] Whitelist IP: `0.0.0.0/0`
- [ ] Copy connection string

### 2. Railway Project (2 minutes)
- [ ] Create new Railway project
- [ ] Connect GitHub repository
- [ ] Cancel initial auto-deploy

### 3. Backend Service (5 minutes)
- [ ] Add new service from GitHub
- [ ] Set Root Directory: `backend`
- [ ] Set Start Command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
- [ ] Add Environment Variables:
  - `MONGO_URL` = (your MongoDB connection string)
  - `DB_NAME` = `miswa_international`
  - `CORS_ORIGINS` = (will update after frontend)
- [ ] Copy backend URL

### 4. Frontend Service (5 minutes)
- [ ] Add new service from GitHub
- [ ] Set Root Directory: `frontend`
- [ ] Set Build Command: `yarn install && yarn build`
- [ ] Set Start Command: `yarn serve` (or leave empty, Railway uses Procfile)
- [ ] Add Environment Variable:
  - `REACT_APP_BACKEND_URL` = (your backend Railway URL)
- [ ] Copy frontend URL

### 5. Final Configuration (2 minutes)
- [ ] Update backend `CORS_ORIGINS` with frontend URL
- [ ] Test backend at: `https://your-backend.railway.app/docs`
- [ ] Test frontend at: `https://your-frontend.railway.app`

---

## Environment Variables Summary

### Backend
```
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/miswa_international?retryWrites=true&w=majority
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
| Backend won't start | Check MongoDB connection string |
| CORS errors | Update CORS_ORIGINS in backend |
| Frontend blank page | Check REACT_APP_BACKEND_URL |
| Build fails | Check logs, verify dependencies |

---

## Test URLs

After deployment, test these:
- Backend API Docs: `https://your-backend.railway.app/docs`
- Backend Brands: `https://your-backend.railway.app/api/brands`
- Frontend: `https://your-frontend.railway.app`

---

📖 **Full detailed guide**: See `RAILWAY_DEPLOYMENT.md`

