# 🚀 Railway Deployment Guide - Step by Step

This guide will walk you through deploying the Miswa International application on Railway.

## 📋 Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app) (free tier available)
2. **GitHub Account**: Your code should be in a GitHub repository
3. **No separate MongoDB account needed** - We'll use Railway's MongoDB service (included)

---

## 🗺️ Deployment Overview

You'll need to deploy **3 services** on Railway:
1. **Backend** (FastAPI) - Root Directory: `backend`
2. **Frontend** (React) - Root Directory: `frontend`
3. **MongoDB** (Railway service or MongoDB Atlas)

---

## 📝 Step 1: Prepare Your Code for Deployment

### 1.1 Ensure your code is pushed to GitHub

```bash
# If not already done, commit and push your code
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

---

## 🔧 Step 2: Create MongoDB Database on Railway

### Using Railway MongoDB Service (Recommended & Easy)

1. **Create Railway Project first** (see Step 3 below)
2. Once your project is created, in the Railway dashboard:
   - Click **"New"** → **"Database"** → **"MongoDB"**
3. Railway will automatically:
   - Provision a MongoDB instance
   - Generate connection credentials
   - Create environment variables automatically
4. **Important**: Railway will create a `MONGO_URL` variable automatically. You can view it in:
   - Click on the MongoDB service
   - Go to **Variables** tab
   - You'll see `MONGO_URL` with the connection string
5. Railway's MongoDB connection string looks like:
   ```
   mongodb://mongo:27017
   ```
   or
   ```
   mongodb://mongo.railway.internal:27017
   ```
   
**Note**: Railway automatically creates the `MONGO_URL` variable and shares it with other services in the same project. This makes connecting your backend super easy!

### Alternative: Use MongoDB Atlas (Only if needed)

If you prefer MongoDB Atlas for any reason:
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account and cluster
3. Create database user and whitelist IPs
4. Copy connection string and use it as `MONGO_URL` in backend variables

---

## 🚂 Step 3: Create Railway Project & MongoDB

1. Go to [railway.app](https://railway.app) and sign in
2. Click **"New Project"**
3. Select **"Empty Project"** (or "Deploy from GitHub repo" - we'll add services manually)
4. Give your project a name (e.g., "Miswa International")
5. **Add MongoDB Database**:
   - In your new project, click **"New"** → **"Database"** → **"MongoDB"**
   - Railway will provision MongoDB automatically
   - Wait for it to deploy (takes 1-2 minutes)
   - Once ready, Railway creates `MONGO_URL` variable automatically

**Note**: The `MONGO_URL` variable will be available to all services in this project automatically!

---

## ⚙️ Step 4: Deploy Backend Service

### 4.1 Create Backend Service

1. In your Railway project, click **"New"** → **"GitHub Repo"**
2. Select the same repository (Miswa-main)
3. Railway will create a new service

### 4.2 Configure Backend Service

1. Click on the **backend service**
2. Go to **Settings** tab
3. Set **Root Directory**: `backend`
4. Set **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
5. Set **Build Command**: (leave empty or use `pip install -r requirements.txt`)

### 4.3 Set Backend Environment Variables

1. In the backend service, go to **Variables** tab
2. **MongoDB Connection** (Easiest option):
   - Railway's MongoDB service automatically shares `MONGO_URL` variable
   - If you see `MONGO_URL` already there (from MongoDB service), you're good!
   - If not, add it manually by referencing the MongoDB service's variable
3. **Add these variables**:

```
DB_NAME = miswa_international
```

```
CORS_ORIGINS = https://your-frontend-domain.railway.app
```
*(We'll update this after frontend is deployed - leave blank for now or use placeholder)*

**Note**: 
- Railway automatically provides a `PORT` variable - don't override it
- Railway automatically provides `MONGO_URL` from MongoDB service - usually you don't need to set it manually
- If `MONGO_URL` is not automatically available, check that both services are in the same Railway project

### 4.4 Deploy Backend

1. Railway will automatically deploy when you push to GitHub
2. Or click **"Redeploy"** in the Deployments tab
3. Wait for deployment to complete
4. Check the **Deployments** tab for logs
5. Once deployed, Railway will provide a URL like: `https://your-backend-name.railway.app`

**Copy this backend URL** - you'll need it for the frontend.

---

## 🎨 Step 5: Deploy Frontend Service

### 5.1 Create Frontend Service

1. In your Railway project, click **"New"** → **"GitHub Repo"**
2. Select the same repository (Miswa-main)
3. Railway will create a new service

### 5.2 Configure Frontend Service

1. Click on the **frontend service**
2. Go to **Settings** tab
3. Set **Root Directory**: `frontend`
4. Set **Build Command**: `yarn install && yarn build`
5. Set **Start Command**: `npx serve -s build -l $PORT`

**Note**: If Railway doesn't have `serve` installed, you may need to use `npx` or add it to package.json. Alternatively, you can use the static files option.

### 5.3 Alternative: Use Static Files with Nginx

If the above doesn't work, create a simple static file server:

1. In **Settings**, set:
   - **Build Command**: `yarn install && yarn build`
   - **Start Command**: Leave empty or use a custom script

2. Railway will serve the `build` folder automatically if configured correctly.

### 5.4 Set Frontend Environment Variables

1. In the frontend service, go to **Variables** tab
2. Click **"New Variable"** and add:

```
REACT_APP_BACKEND_URL = https://your-backend-name.railway.app
```
*(Replace with your actual backend Railway URL)*

### 5.5 Deploy Frontend

1. Railway will automatically deploy
2. Wait for build to complete (this takes longer - 3-5 minutes)
3. Once deployed, Railway will provide a URL like: `https://your-frontend-name.railway.app`

**Copy this frontend URL**.

---

## 🔄 Step 6: Update CORS and Environment Variables

### 6.1 Update Backend CORS

1. Go back to **Backend Service** → **Variables**
2. Update `CORS_ORIGINS` to include your frontend URL:
   ```
   CORS_ORIGINS = https://your-frontend-name.railway.app,http://localhost:3000
   ```
3. Railway will automatically redeploy

### 6.2 (Optional) Add Custom Domains

1. In each service, go to **Settings** → **Domains**
2. Click **"Generate Domain"** to get a Railway domain
3. Or add your custom domain (requires DNS configuration)

---

## ✅ Step 7: Verify Deployment

### 7.1 Test Backend

1. Visit: `https://your-backend-name.railway.app/docs`
2. You should see the FastAPI documentation
3. Test an endpoint: `https://your-backend-name.railway.app/api/brands`

### 7.2 Test Frontend

1. Visit: `https://your-frontend-name.railway.app`
2. The website should load
3. Check browser console for any errors
4. Test navigation and API calls

### 7.3 Test Admin Panel

1. Navigate to `/admin` route (if applicable)
2. Verify admin functionality works

---

## 🔧 Step 8: Verify MongoDB Connection

Ensure your MongoDB connection is working:

1. Check that MongoDB service is running in Railway (should show "Active" status)
2. Verify `MONGO_URL` is available in backend service variables (auto-shared from MongoDB service)
3. Check backend logs in Railway for MongoDB connection errors
4. Test connection by accessing `/api/brands` endpoint - should return data or empty array

---

## 🐛 Troubleshooting

### Backend Issues

**Problem**: Backend won't start
- **Solution**: Check logs in Railway Deployments tab
- Verify `MONGO_URL` is correct
- Ensure `PORT` variable is not overridden
- Check Python version compatibility

**Problem**: CORS errors
- **Solution**: Update `CORS_ORIGINS` in backend variables to include frontend URL

**Problem**: MongoDB connection failed
- **Solution**: 
  - Verify MongoDB service is running in Railway (check service status)
  - Ensure `MONGO_URL` variable is available in backend service (should be auto-shared from MongoDB service)
  - Check that both MongoDB and Backend services are in the same Railway project
  - Check backend logs for specific MongoDB connection errors
  - If using Railway MongoDB, connection is usually automatic - no IP whitelisting needed

### Frontend Issues

**Problem**: Frontend shows blank page
- **Solution**: 
  - Check browser console for errors
  - Verify `REACT_APP_BACKEND_URL` is set correctly
  - Check build logs in Railway

**Problem**: API calls failing
- **Solution**:
  - Verify `REACT_APP_BACKEND_URL` matches backend URL
  - Check CORS configuration in backend
  - Verify backend is running and accessible

**Problem**: Build fails
- **Solution**:
  - Check Node.js version (Railway auto-detects)
  - Verify all dependencies in package.json
  - Check build logs for specific errors

### General Issues

**Problem**: Services not connecting
- **Solution**: Use Railway's internal networking or public URLs
- Ensure environment variables are set correctly

**Problem**: Deployment stuck
- **Solution**: 
  - Cancel and redeploy
  - Check Railway status page
  - Verify GitHub repository is accessible

---

## 📊 Railway Dashboard Features

### Monitoring

1. **Metrics**: View CPU, memory, and network usage
2. **Logs**: Real-time logs from your services
3. **Deployments**: View deployment history and status

### Scaling

- Railway auto-scales based on traffic
- Free tier includes limited resources
- Upgrade for more resources if needed

### Environment Variables

- Set per-service environment variables
- Use secrets for sensitive data
- Share variables across services if needed

---

## 🎯 Post-Deployment Checklist

- [ ] Backend is accessible at Railway URL
- [ ] Frontend is accessible at Railway URL
- [ ] API endpoints are working (`/api/brands`, `/api/blogs`, etc.)
- [ ] Frontend can communicate with backend
- [ ] MongoDB connection is working
- [ ] Admin panel is accessible and functional
- [ ] All environment variables are set correctly
- [ ] Custom domains are configured (if applicable)

---

## 🔐 Security Best Practices

1. **Never commit `.env` files** to GitHub
2. **Use Railway's secret variables** for sensitive data
3. **Railway MongoDB credentials are automatically secured** - they're only visible within your project
4. **Regularly update dependencies**
5. **Use HTTPS** (Railway provides this automatically)

---

## 💰 Railway Pricing

- **Free Tier**: $5 credit monthly, suitable for development
- **Pro Tier**: Pay-as-you-go for production
- Check [Railway Pricing](https://railway.app/pricing) for details

---

## 📞 Support

If you encounter issues:

1. Check Railway documentation: [docs.railway.app](https://docs.railway.app)
2. Check Railway Discord community
3. Review deployment logs in Railway dashboard
4. Verify environment variables and configuration

---

## 🎉 Success!

Once everything is deployed and working:
- Your website will be live at your Railway frontend URL
- API will be accessible at your Railway backend URL
- Admin panel will be functional
- All data will be stored in MongoDB

**Congratulations on deploying Miswa International to Railway!** 🚀

