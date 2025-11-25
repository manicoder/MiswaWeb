# Cost of Goods Sold (COGS) Analytics

This document describes the Cost of Goods Sold (COGS) analytics feature that calculates the cost of goods sold based on fulfilled, non-voided, non-cancelled orders across all platforms (Shopify, Amazon, Flipkart).

## Overview

The COGS analytics system provides:
- **Cost calculation** for fulfilled orders
- **Multi-platform support** (Shopify, Amazon, Flipkart)
- **Multiple cost strategies** for accurate cost calculation
- **Detailed breakdowns** by product and platform
- **Profit margin analysis** with gross margin calculations

## Stored Procedures

### 1. GetCOGSSummary
Returns a simplified summary of COGS data across all platforms.

**Parameters:**
- `p_start_date` (TIMESTAMP WITH TIME ZONE): Start date filter
- `p_end_date` (TIMESTAMP WITH TIME ZONE): End date filter  
- `p_currency` (VARCHAR(10)): Currency filter (e.g., 'INR')

**Returns:**
- `total_revenue`: Total revenue from all platforms
- `total_orders`: Total number of orders
- `total_cost_of_goods`: Total cost of goods sold
- `total_profit`: Total profit (revenue - COGS)
- `gross_margin`: Gross margin percentage
- `average_order_value`: Average order value
- `average_cost_per_order`: Average cost per order

### 2. GetCostOfGoodsSold
Returns detailed COGS analytics with platform breakdown and product-level details.

**Parameters:**
- `p_start_date` (TIMESTAMP WITH TIME ZONE): Start date filter
- `p_end_date` (TIMESTAMP WITH TIME ZONE): End date filter
- `p_currency` (VARCHAR(10)): Currency filter
- `p_platform` (VARCHAR(20)): Platform filter ('shopify', 'amazon', 'flipkart', or NULL for all)

**Returns:**
- `platform`: Platform name
- `total_revenue`: Platform revenue
- `total_orders`: Platform order count
- `total_cost_of_goods`: Platform COGS
- `total_profit`: Platform profit
- `gross_margin`: Platform gross margin
- `average_order_value`: Platform average order value
- `average_cost_per_order`: Platform average cost per order
- `cost_breakdown`: JSON array of product-level cost breakdown
- `top_products_by_cost`: JSON array of top products by cost

## Cost Calculation Strategies

The system uses multiple strategies to calculate product costs, in order of preference:

### Strategy 1: ProductCosts Table (Most Accurate)
- Uses the dedicated `ProductCosts` table
- Matches by `ProductId` and `Sku`
- Most accurate when cost data is properly maintained

### Strategy 2: ShopifyProductVariants CostPerItem
- Uses `CostPerItem` from `ShopifyProductVariants` table
- Matches by `ShopifyVariantId` or `Sku`
- Good for products with cost data in variants

### Strategy 3: Average Cost Per Product
- Calculates average cost per item for the product
- Uses available cost data from all variants
- Fallback when individual variant costs are missing

### Strategy 4: Default Cost (60% of Selling Price)
- Defaults to 60% of selling price as cost
- Used when no cost data is available
- Conservative estimate for margin calculation

## Order Filtering

The system only includes orders that meet these criteria:
- **Fulfillment Status**: `fulfilled` (case-insensitive)
- **Financial Status**: NOT `cancelled`, `voided`, or `refunded`
- **Date Range**: Within specified start/end dates
- **Currency**: Matches specified currency (if provided)

## API Endpoints

### GET /api/Finance/cogs/summary
Returns COGS summary for all platforms.

**Query Parameters:**
- `startDate` (optional): Start date (ISO format)
- `endDate` (optional): End date (ISO format)
- `currency` (optional): Currency code (e.g., 'INR')

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRevenue": 100000.00,
    "totalOrders": 150,
    "totalCostOfGoods": 60000.00,
    "totalProfit": 40000.00,
    "grossMargin": 40.00,
    "averageOrderValue": 666.67,
    "averageCostPerOrder": 400.00
  }
}
```

### GET /api/Finance/cogs/analytics
Returns detailed COGS analytics with platform breakdown.

**Query Parameters:**
- `startDate` (optional): Start date (ISO format)
- `endDate` (optional): End date (ISO format)
- `currency` (optional): Currency code (e.g., 'INR')
- `platform` (optional): Platform filter ('shopify', 'amazon', 'flipkart')

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "platform": "shopify",
      "totalRevenue": 80000.00,
      "totalOrders": 120,
      "totalCostOfGoods": 48000.00,
      "totalProfit": 32000.00,
      "grossMargin": 40.00,
      "averageOrderValue": 666.67,
      "averageCostPerOrder": 400.00,
      "costBreakdown": [...],
      "topProductsByCost": [...]
    }
  ]
}
```

## Deployment

### 1. Deploy Stored Procedures
```bash
cd MltAdminApi/SQL
./deploy-cogs-analytics.sh
```

### 2. Test the Functions
```bash
psql $DATABASE_URL -f test-cogs.sql
```

### 3. Verify API Endpoints
```bash
# Test COGS summary
curl "http://localhost:5000/api/Finance/cogs/summary?startDate=2024-01-01&endDate=2024-12-31&currency=INR"

# Test COGS analytics
curl "http://localhost:5000/api/Finance/cogs/analytics?startDate=2024-01-01&endDate=2024-12-31&currency=INR&platform=shopify"
```

## Data Requirements

### ProductCosts Table
Ensure the `ProductCosts` table has accurate cost data:
```sql
INSERT INTO "ProductCosts" (
    "Id", "ProductId", "VariantId", "Sku", "CostPrice", 
    "Currency", "Supplier", "Notes", "LastUpdatedBy", 
    "CreatedAt", "UpdatedAt"
) VALUES (
    'cost_123', 'product_456', 'variant_789', 'SKU123', 150.00,
    'INR', 'Supplier Name', 'Sample cost data', 'system',
    NOW(), NOW()
);
```

### ShopifyProductVariants Table
Ensure variants have `CostPerItem` data:
```sql
UPDATE "ShopifyProductVariants" 
SET "CostPerItem" = 150.00 
WHERE "Sku" = 'SKU123';
```

## Performance Considerations

- **Indexes**: Ensure proper indexes on `CreatedAt`, `FulfillmentStatus`, `DisplayFinancialStatus`
- **JSON Parsing**: Line items are parsed from JSON for cost calculation
- **Platform Filtering**: Use platform parameter to limit data processing
- **Date Ranges**: Use date filters to limit data processing

## Troubleshooting

### Common Issues

1. **No COGS Data**: Ensure `ProductCosts` table has data or `ShopifyProductVariants` has `CostPerItem`
2. **No Orders**: Check if orders meet fulfillment and financial status criteria
3. **Zero Costs**: Verify cost calculation strategies are working
4. **Performance**: Use date ranges and platform filters to limit data

### Debug Queries

```sql
-- Check order filtering
SELECT COUNT(*) FROM "ShopifyOrders" 
WHERE "FulfillmentStatus" ILIKE 'fulfilled'
  AND "DisplayFinancialStatus" NOT IN ('cancelled', 'voided', 'refunded');

-- Check cost data availability
SELECT COUNT(*) FROM "ProductCosts";
SELECT COUNT(*) FROM "ShopifyProductVariants" WHERE "CostPerItem" IS NOT NULL;

-- Check line items structure
SELECT "LineItemsJson" FROM "ShopifyOrders" LIMIT 1;
```

## Future Enhancements

1. **Amazon/Flipkart Cost Integration**: Add cost calculation for Amazon and Flipkart orders
2. **Advanced Cost Strategies**: Add FIFO, LIFO, weighted average cost methods
3. **Cost History**: Track cost changes over time
4. **Margin Alerts**: Set up alerts for low margin products
5. **Cost Forecasting**: Predict future costs based on historical data 