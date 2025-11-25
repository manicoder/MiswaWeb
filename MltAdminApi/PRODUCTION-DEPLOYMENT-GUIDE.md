# 🚀 **PRODUCTION DEPLOYMENT GUIDE**

## **Overview**
This guide ensures that ALL stored procedures are automatically created during production deployment, preventing the "function does not exist" errors.

## **✅ What's Fixed**

### **Previously Missing Stored Procedures:**
- ✅ `GetShopifyProductsWithInventory()` - Inventory queries
- ✅ `GetShopifyInventoryCount()` - Inventory statistics  
- ✅ `GetShopifyProductsWithWindow()` - Product pagination
- ✅ `GetShopifyProductsByLocation()` - Location-based queries
- ✅ `GetFinanceDashboardSummary()` - Finance dashboard
- ✅ `GetSimpleSalesAnalytics()` - Sales analytics
- ✅ `GetTopSellingProducts()` - Top selling products
- ✅ `GetProductsWithAdvancedFiltering()` - Advanced product filtering

### **Migration Strategy:**
- ✅ **Fresh Migration**: `20250726062550_AddAllStoredProcedures`
- ✅ **Comprehensive SQL**: `SQL/comprehensive-stored-procedures.sql`
- ✅ **Automatic Deployment**: All functions created during `dotnet ef database update`

## **📋 Production Deployment Steps**

### **1. Database Migration**
```bash
# Apply all migrations (includes stored procedures)
dotnet ef database update
```

### **2. Verify Stored Procedures**
```bash
# Check if all functions exist
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
SELECT proname, proargtypes 
FROM pg_proc 
WHERE proname IN (
    'getshopifyproductswithinventory',
    'getshopifyinventorycount', 
    'getshopifyproductswithwindow',
    'getshopifyproductsbylocation',
    'getfinancedashboardsummary',
    'getsimplesalesanalytics',
    'gettopsellingproducts',
    'getproductswithadvancedfiltering'
);
"
```

### **3. Test Critical Endpoints**
```bash
# Test inventory endpoint
curl "http://your-api-url/api/shopify/inventory?page=1&limit=50&method=window"

# Test finance dashboard
curl "http://your-api-url/api/finance/dashboard"

# Test cost fetching
curl -X POST "http://your-api-url/api/shopify/costs/fetch"
```

## **🔧 Deployment Scripts**

### **Automated Deployment Script**
```bash
#!/bin/bash
# deploy-production.sh

set -e

echo "🚀 Starting Production Deployment..."

# 1. Build the application
dotnet build --configuration Release

# 2. Apply database migrations (includes stored procedures)
dotnet ef database update

# 3. Verify stored procedures
echo "🔍 Verifying stored procedures..."
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
SELECT '✅ ' || proname || ' exists' as status
FROM pg_proc 
WHERE proname IN (
    'getshopifyproductswithinventory',
    'getshopifyinventorycount', 
    'getshopifyproductswithwindow',
    'getshopifyproductsbylocation',
    'getfinancedashboardsummary',
    'getsimplesalesanalytics',
    'gettopsellingproducts',
    'getproductswithadvancedfiltering'
);
"

# 4. Start the application
dotnet run --configuration Release
```

### **Railway Deployment**
```json
// railway.json
{
  "build": {
    "builder": "nixpacks"
  },
  "deploy": {
    "startCommand": "dotnet ef database update && dotnet MltAdminApi.dll",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

## **📁 File Structure**

```
MltAdminApi/
├── Migrations/
│   └── 20250726062550_AddAllStoredProcedures.cs  # ✅ All stored procedures
├── SQL/
│   ├── comprehensive-stored-procedures.sql        # ✅ Complete SQL file
│   └── all-stored-procedures.sql                 # ✅ Backup SQL file
├── deploy-stored-procedures.sh                   # ✅ Deployment script
└── PRODUCTION-DEPLOYMENT-GUIDE.md               # ✅ This guide
```

## **🔍 Verification Commands**

### **Check Migration Status**
```bash
dotnet ef migrations list
```

### **Verify Database Functions**
```bash
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE proname LIKE 'get%'
ORDER BY proname;
"
```

### **Test Function Execution**
```bash
# Test inventory function
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
SELECT * FROM GetShopifyInventoryCount('00000000-0000-0000-0000-000000000000');
"

# Test finance function  
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
SELECT * FROM GetFinanceDashboardSummary(NULL, NULL, NULL);
"
```

## **🚨 Troubleshooting**

### **If Functions Are Missing:**
```bash
# 1. Check migration history
dotnet ef migrations list

# 2. Reapply migrations
dotnet ef database update

# 3. Manually apply SQL if needed
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f SQL/comprehensive-stored-procedures.sql
```

### **If Migration Fails:**
```bash
# 1. Remove failed migration
dotnet ef migrations remove

# 2. Create fresh migration
dotnet ef migrations add AddAllStoredProcedures

# 3. Apply migration
dotnet ef database update
```

## **✅ Success Indicators**

### **API Endpoints Working:**
- ✅ `GET /api/shopify/inventory` - No 500 errors
- ✅ `GET /api/finance/dashboard` - Returns data
- ✅ `POST /api/shopify/costs/fetch` - Starts cost fetching
- ✅ `GET /api/shopify/products` - Product listing works

### **Database Functions Exist:**
- ✅ All 8 stored procedures created
- ✅ Proper permissions granted
- ✅ Functions return expected data

## **🎯 Production Checklist**

- [ ] **Database Migration Applied**: `dotnet ef database update`
- [ ] **Stored Procedures Created**: All 8 functions exist
- [ ] **API Endpoints Tested**: No 500 errors on critical endpoints
- [ ] **Cost Fetching Working**: Can start cost fetching process
- [ ] **Inventory Loading**: Database-backed inventory loads correctly
- [ ] **Finance Dashboard**: Dashboard shows data without errors

## **📞 Support**

If you encounter any issues:

1. **Check Migration Status**: `dotnet ef migrations list`
2. **Verify Functions**: Use the verification commands above
3. **Review Logs**: Check application logs for specific errors
4. **Manual SQL**: Apply `SQL/comprehensive-stored-procedures.sql` directly

**🎉 Your production deployment is now guaranteed to include all required stored procedures!** 