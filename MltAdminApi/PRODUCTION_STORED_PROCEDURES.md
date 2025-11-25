# Production Stored Procedures Deployment Guide

## 🚀 Quick Deployment

### Option 1: Automated Deployment (Recommended)
```bash
# Set your database credentials
export DB_HOST=your-production-db-host
export DB_NAME=your-production-database-name
export DB_USER=your-database-username
export DB_PASSWORD=your-database-password

# Run the deployment script
./deploy-stored-procedures.sh
```

### Option 2: Manual Deployment
```bash
# Deploy finance dashboard stored procedures
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f SQL/FinanceDashboardStoredProcedures.sql

# Deploy product optimization stored procedures
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f SQL/ProductOptimizationStoredProcedures.sql
```

## ✅ Verification Commands

### Test Finance Dashboard
```bash
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 'Finance Dashboard Test' as test_name, total_revenue, total_orders FROM getfinancedashboardsummary(NULL, NULL, NULL);"
```

### Test Product Functions
```bash
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT * FROM gettopsellingproducts(10) LIMIT 5;"
```

### Count All Functions
```bash
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) as total_functions FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';"
```

## 📊 What Gets Deployed

### Finance Dashboard Functions (8 functions)
- `getfinancedashboardsummary` - Main finance dashboard data
- `getrecentanalytics` - Recent analytics data
- `getrecentexpenses` - Recent expenses
- `getapprovedexpensesbreakdown` - Approved expenses breakdown
- `getplatformbreakdown` - Platform-wise breakdown
- `getsalesanalytics` - Sales analytics
- `gettopsellingproducts` - Top selling products
- `populateproductcosts` - Sample cost data population

### Product Optimization Functions (8 functions)
- `getproductcounts` - Product counts by location
- `getproductsbylocation` - Products by location
- `getproductswithadvancedfiltering` - Advanced filtering
- `getproductvariantswithinventory` - Product variants with inventory
- `getshopifyproductsbylocation` - Shopify products by location
- `getshopifyproductswithinventory` - Shopify products with inventory
- `getshopifyproductswithwindow` - Shopify products with window
- `searchproductsadvanced` - Advanced product search

## 🔧 Troubleshooting

### Common Issues

**1. Connection Error**
```bash
# Check if PostgreSQL client is installed
which psql

# Install if missing:
# Ubuntu/Debian: sudo apt-get install postgresql-client
# macOS: brew install postgresql
```

**2. Permission Error**
```bash
# Make script executable
chmod +x deploy-stored-procedures.sh
```

**3. Function Already Exists**
```bash
# This is normal - functions will be replaced
# Check if deployment was successful:
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public';"
```

**4. Data Type Errors**
```bash
# If you get data type errors, redeploy:
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f SQL/FinanceDashboardStoredProcedures.sql
```

## 📈 Performance Notes

- **Finance Dashboard:** Optimized for 5,000+ orders (tested with ₹5.1M revenue)
- **Product Functions:** Optimized for 10,000+ products
- **Response Time:** < 1 second for most queries
- **Memory Usage:** Minimal - uses database indexes efficiently

## 🔄 Updates

To update stored procedures in production:

```bash
# Redeploy all stored procedures
./deploy-stored-procedures.sh

# Or redeploy specific files
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f SQL/FinanceDashboardStoredProcedures.sql
```

## 📞 Support

If you encounter issues:
1. Check the deployment logs
2. Verify database connectivity
3. Test individual functions
4. Check the main deployment checklist: `PRODUCTION_DEPLOYMENT_CHECKLIST.md` 