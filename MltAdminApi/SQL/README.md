# SQL Folder Organization

This folder contains all SQL stored procedures and deployment scripts for the MLT Admin API.

## 📁 File Structure

### Stored Procedures
- `FinanceDashboardStoredProcedures.sql` - Finance dashboard related stored procedures
- `ProductOptimizationStoredProcedures.sql` - Product optimization stored procedures

### Deployment Scripts
- `deploy-top-selling-products.sql` - Optimized top selling products stored procedure
- `deploy-top-selling-products.sh` - Shell script to deploy the top selling products procedure
- `deploy-finance-optimization.sh` - Finance optimization deployment script
- `deploy-product-optimization.sh` - Product optimization deployment script
- `deploy-all.sh` - Master script to deploy all stored procedures
- `run-finance-stored-procedures.sql` - Finance stored procedures deployment
- `run-top-selling-products.sql` - Top selling products deployment
- `test-top-selling-products.sql` - Test script for top selling products

## 🚀 Deployment Commands

### Deploy All Stored Procedures
```bash
cd MltAdminApi/SQL
./deploy-all.sh
```

### Deploy Top Selling Products Only
```bash
cd MltAdminApi/SQL
./deploy-top-selling-products.sh
```

### Manual Deployment
```bash
# Using default database
psql postgresql://postgres:postgres@localhost:5432/mlt_admin_dev -f deploy-top-selling-products.sql

# Using custom DATABASE_URL
DATABASE_URL="your_connection_string" psql "$DATABASE_URL" -f deploy-top-selling-products.sql
```

## 📊 Stored Procedures

### GetTopSellingProducts
- **Purpose**: Returns top selling products with revenue, cost, and profit calculations
- **Parameters**: 
  - `p_start_date` (optional): Start date filter
  - `p_end_date` (optional): End date filter  
  - `p_currency` (optional): Currency filter
  - `p_limit` (default: 20): Number of results to return
- **Returns**: Product name, ID, image URL, quantities, revenue, cost, profit, and margin

## 🔧 Optimization Features

- **Single Query Processing**: Eliminates individual database queries
- **Multiple Cost Matching**: Uses SKU, variant ID, product title, and average cost strategies
- **Performance**: Reduces response time from 30+ seconds to milliseconds
- **Error Handling**: Graceful handling of missing data and edge cases

## 📝 Notes

- All stored procedures are optimized for performance
- Shell scripts include testing to verify successful deployment
- Database connection can be customized via `DATABASE_URL` environment variable 