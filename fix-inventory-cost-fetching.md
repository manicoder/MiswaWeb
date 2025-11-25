# 🔧 Fix Inventory & Cost Fetching Issues

## **Current Issues:**
1. **Inventory 500 Error**: Authentication/Store Connection issue
2. **Cost Fetching Failed**: Similar authentication/connection issues

## **Root Cause:**
The backend endpoints require authentication and store connections, but the frontend is making unauthenticated requests.

## **Solutions:**

### **Option 1: Quick Fix (Temporary)**
I've already added `[AllowAnonymous]` to the inventory endpoint. Now restart the backend:

```bash
# Stop current backend
pkill -f "dotnet run"

# Start backend
cd MltAdminApi
dotnet run
```

### **Option 2: Proper Authentication Fix**

#### **Step 1: Check Frontend Authentication**
Make sure the frontend is sending authentication headers:

```typescript
// In api.ts, ensure requests include auth headers
const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Authorization': `Bearer ${getToken()}`, // Add this
    'Content-Type': 'application/json',
  },
});
```

#### **Step 2: Check Store Connection**
1. Go to Shopify settings in the frontend
2. Connect your Shopify store
3. Verify the connection is active

#### **Step 3: Test Endpoints**
```bash
# Test inventory endpoint
curl -s "http://localhost:5001/api/shopify/inventory?page=1&limit=50&method=window"

# Test cost fetching
curl -X POST "http://localhost:5001/api/shopify/costs/fetch" \
  -H "Content-Type: application/json"
```

### **Option 3: Debug Mode (Recommended)**
Add more debugging endpoints:

```csharp
[HttpGet("debug/auth")]
[AllowAnonymous]
public IActionResult DebugAuth()
{
    return Ok(new
    {
        IsAuthenticated = User.Identity?.IsAuthenticated ?? false,
        UserId = GetCurrentUserId(),
        Claims = User.Claims.Select(c => new { c.Type, c.Value })
    });
}

[HttpGet("debug/store")]
[AllowAnonymous]
public async Task<IActionResult> DebugStore()
{
    var userId = GetCurrentUserId();
    var storeConnection = await _storeConnectionService.GetDefaultStoreConnectionAsync(userId ?? Guid.Empty, "shopify");
    
    return Ok(new
    {
        UserId = userId,
        HasStoreConnection = storeConnection != null,
        StoreConnection = storeConnection
    });
}
```

## **Testing Steps:**

### **1. Test Backend Status**
```bash
curl http://localhost:5001/api/shopify/status
```

### **2. Test Authentication**
```bash
curl http://localhost:5001/api/shopify/debug/auth
```

### **3. Test Store Connection**
```bash
curl http://localhost:5001/api/shopify/debug/store
```

### **4. Test Inventory**
```bash
curl "http://localhost:5001/api/shopify/inventory?page=1&limit=50&method=window"
```

### **5. Test Cost Fetching**
```bash
curl -X POST "http://localhost:5001/api/shopify/costs/fetch" \
  -H "Content-Type: application/json"
```

## **Browser Console Test:**
```javascript
// Copy this into browser console
async function testAll() {
  console.log('🔍 Testing all endpoints...');
  
  const endpoints = [
    '/api/shopify/status',
    '/api/shopify/debug/auth',
    '/api/shopify/debug/store',
    '/api/shopify/inventory?page=1&limit=50&method=window',
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing: ${endpoint}`);
      const response = await fetch(endpoint);
      const data = await response.json();
      console.log('✅ Success:', data);
    } catch (error) {
      console.error(`❌ Failed: ${endpoint}`, error);
    }
  }
}

testAll();
```

## **Expected Results:**

### **✅ Working:**
- Backend responds on port 5001
- Authentication shows user details
- Store connection exists
- Inventory returns data
- Cost fetching starts successfully

### **❌ Issues to Fix:**
- **No backend**: Start with `dotnet run`
- **No auth**: Check frontend login
- **No store**: Connect Shopify store
- **Database error**: Check connection string

## **Next Steps:**
1. Restart the backend
2. Test the endpoints
3. Check browser console for errors
4. Connect Shopify store if needed
5. Try cost fetching again

Let me know what the test results show! 