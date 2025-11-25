# 🔍 Cost Fetching Debug Guide

## **Common Issues & Solutions**

### **1. Store Connection Issue**
**Error**: "Store connection not found"
**Solution**: 
- Go to Shopify settings and connect your store
- Make sure the connection is active and verified

### **2. Authentication Issue**
**Error**: 401 Unauthorized
**Solution**:
- Make sure you're logged in to the application
- Check if your session is still valid

### **3. Backend Service Issue**
**Error**: Connection refused or timeout
**Solution**:
- Start the backend: `cd MltAdminApi && dotnet run`
- Check if the service is running on the correct port

### **4. Database Connection Issue**
**Error**: Database connection failed
**Solution**:
- Check database connection string in `appsettings.json`
- Ensure database is running and accessible

### **5. Shopify API Rate Limiting**
**Error**: Rate limit exceeded
**Solution**:
- The service includes rate limiting (2 requests per second)
- Wait a few minutes and try again

## **Debugging Steps**

### **Step 1: Check Backend Status**
```bash
curl -s http://localhost:5000/api/shopify/status
```

### **Step 2: Check Store Connection**
```bash
curl -s http://localhost:5000/api/shopify/connection-status
```

### **Step 3: Test Cost Fetching Endpoint**
```bash
curl -X POST http://localhost:5000/api/shopify/costs/fetch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### **Step 4: Check Browser Console**
1. Open Developer Tools (F12)
2. Go to Network tab
3. Try to start cost fetching
4. Look for the API call to `/shopify/costs/fetch`
5. Check the response for error details

### **Step 5: Check Backend Logs**
```bash
# If using Docker
docker logs mlt-admin-api

# If running locally
tail -f MltAdminApi/logs/app.log
```

## **Quick Fixes**

### **Fix 1: Restart Backend**
```bash
cd MltAdminApi
dotnet run
```

### **Fix 2: Clear Browser Cache**
- Clear browser cache and cookies
- Refresh the page
- Try again

### **Fix 3: Check Network**
- Ensure you have internet connection
- Check if Shopify API is accessible

### **Fix 4: Verify Store Connection**
1. Go to Shopify settings
2. Disconnect and reconnect your store
3. Try cost fetching again

## **Expected Behavior**

### **Successful Cost Fetching**
1. Click "Start Cost Fetching" button
2. Progress bar appears with real-time updates
3. Statistics cards update with new data
4. Timeline shows the complete process

### **Error Scenarios**
1. **No Store Connected**: Shows "Store connection not found"
2. **No Products**: Shows "No variants found to fetch costs"
3. **API Error**: Shows specific error message from Shopify
4. **Network Error**: Shows connection timeout message

## **Contact Support**
If the issue persists, please provide:
1. Browser console errors
2. Backend logs
3. Steps to reproduce the issue
4. Your Shopify store domain (if applicable) 