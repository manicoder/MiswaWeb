-- =============================================
-- Get Cost of Goods Sold (COGS) Analytics - Shopify Only
-- =============================================
CREATE OR REPLACE FUNCTION GetCostOfGoodsSold(
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_currency VARCHAR(10) DEFAULT NULL,
    p_platform VARCHAR(20) DEFAULT 'shopify' -- Only Shopify supported
)
RETURNS TABLE (
    platform VARCHAR(20),
    total_revenue DECIMAL(18,2),
    total_orders INTEGER,
    total_cost_of_goods DECIMAL(18,2),
    total_profit DECIMAL(18,2),
    gross_margin DECIMAL(10,2),
    average_order_value DECIMAL(18,2),
    average_cost_per_order DECIMAL(18,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'shopify'::VARCHAR(20) as platform,
        COALESCE(SUM(so."TotalPrice"), 0) as total_revenue,
        COUNT(*)::INTEGER as total_orders,
        COALESCE(SUM(
            CASE 
                -- Strategy 1: Use ProductCosts table (most accurate)
                WHEN spc."CostPrice" IS NOT NULL AND spc."CostPrice" > 0
                THEN CAST(li_data.line_item->>'quantity' AS INTEGER) * spc."CostPrice"
                -- Strategy 2: Use CostPerItem from ShopifyProductVariants
                WHEN spv."CostPerItem" IS NOT NULL AND spv."CostPerItem" > 0
                THEN CAST(li_data.line_item->>'quantity' AS INTEGER) * spv."CostPerItem"
                -- Strategy 3: Use cost from variant object
                WHEN CAST(li_data.line_item->'variant'->>'cost' AS DECIMAL) > 0
                THEN CAST(li_data.line_item->>'quantity' AS INTEGER) * CAST(li_data.line_item->'variant'->>'cost' AS DECIMAL)
                -- Strategy 4: Use average cost for the product
                WHEN avg_cost.avg_cost_per_item IS NOT NULL AND avg_cost.avg_cost_per_item > 0
                THEN CAST(li_data.line_item->>'quantity' AS INTEGER) * avg_cost.avg_cost_per_item
                -- Strategy 5: Default to 60% of selling price as cost
                ELSE CAST(li_data.line_item->>'quantity' AS INTEGER) * (CAST(li_data.line_item->'variant'->>'price' AS DECIMAL) * 0.6)
            END
        ), 0) as total_cost_of_goods,
        COALESCE(SUM(so."TotalPrice"), 0) - COALESCE(SUM(
            CASE 
                WHEN spc."CostPrice" IS NOT NULL AND spc."CostPrice" > 0
                THEN CAST(li_data.line_item->>'quantity' AS INTEGER) * spc."CostPrice"
                WHEN spv."CostPerItem" IS NOT NULL AND spv."CostPerItem" > 0
                THEN CAST(li_data.line_item->>'quantity' AS INTEGER) * spv."CostPerItem"
                WHEN CAST(li_data.line_item->'variant'->>'cost' AS DECIMAL) > 0
                THEN CAST(li_data.line_item->>'quantity' AS INTEGER) * CAST(li_data.line_item->'variant'->>'cost' AS DECIMAL)
                WHEN avg_cost.avg_cost_per_item IS NOT NULL AND avg_cost.avg_cost_per_item > 0
                THEN CAST(li_data.line_item->>'quantity' AS INTEGER) * avg_cost.avg_cost_per_item
                ELSE CAST(li_data.line_item->>'quantity' AS INTEGER) * (CAST(li_data.line_item->'variant'->>'price' AS DECIMAL) * 0.6)
            END
        ), 0) as total_profit,
        CASE 
            WHEN COALESCE(SUM(so."TotalPrice"), 0) > 0 
            THEN ((COALESCE(SUM(so."TotalPrice"), 0) - COALESCE(SUM(
                CASE 
                    WHEN spc."CostPrice" IS NOT NULL AND spc."CostPrice" > 0
                    THEN CAST(li_data.line_item->>'quantity' AS INTEGER) * spc."CostPrice"
                    WHEN spv."CostPerItem" IS NOT NULL AND spv."CostPerItem" > 0
                    THEN CAST(li_data.line_item->>'quantity' AS INTEGER) * spv."CostPerItem"
                    WHEN CAST(li_data.line_item->'variant'->>'cost' AS DECIMAL) > 0
                    THEN CAST(li_data.line_item->>'quantity' AS INTEGER) * CAST(li_data.line_item->'variant'->>'cost' AS DECIMAL)
                    WHEN avg_cost.avg_cost_per_item IS NOT NULL AND avg_cost.avg_cost_per_item > 0
                    THEN CAST(li_data.line_item->>'quantity' AS INTEGER) * avg_cost.avg_cost_per_item
                    ELSE CAST(li_data.line_item->>'quantity' AS INTEGER) * (CAST(li_data.line_item->'variant'->>'price' AS DECIMAL) * 0.6)
                END
            ), 0)) / COALESCE(SUM(so."TotalPrice"), 0)) * 100
            ELSE 0 
        END as gross_margin,
        CASE 
            WHEN COUNT(*) > 0 
            THEN COALESCE(SUM(so."TotalPrice"), 0) / COUNT(*)::DECIMAL
            ELSE 0 
        END as average_order_value,
        CASE 
            WHEN COUNT(*) > 0 
            THEN COALESCE(SUM(
                CASE 
                    WHEN spc."CostPrice" IS NOT NULL AND spc."CostPrice" > 0
                    THEN CAST(li_data.line_item->>'quantity' AS INTEGER) * spc."CostPrice"
                    WHEN spv."CostPerItem" IS NOT NULL AND spv."CostPerItem" > 0
                    THEN CAST(li_data.line_item->>'quantity' AS INTEGER) * spv."CostPerItem"
                    WHEN CAST(li_data.line_item->'variant'->>'cost' AS DECIMAL) > 0
                    THEN CAST(li_data.line_item->>'quantity' AS INTEGER) * CAST(li_data.line_item->'variant'->>'cost' AS DECIMAL)
                    WHEN avg_cost.avg_cost_per_item IS NOT NULL AND avg_cost.avg_cost_per_item > 0
                    THEN CAST(li_data.line_item->>'quantity' AS INTEGER) * avg_cost.avg_cost_per_item
                    ELSE CAST(li_data.line_item->>'quantity' AS INTEGER) * (CAST(li_data.line_item->'variant'->>'price' AS DECIMAL) * 0.6)
                END
            ), 0) / COUNT(*)::DECIMAL
            ELSE 0 
        END as average_cost_per_order
    FROM "ShopifyOrders" so
    LEFT JOIN LATERAL (
        SELECT 
            jsonb_array_elements(so."LineItemsJson"::jsonb) as line_item
    ) li_data ON true
    LEFT JOIN "ShopifyProductVariants" spv ON spv."Sku" = li_data.line_item->>'sku'
    LEFT JOIN "ProductCosts" spc ON spc."ProductId" = spv."ProductId"::TEXT 
        AND (spc."Sku" = li_data.line_item->>'sku' OR spc."Sku" = spv."Sku")
    LEFT JOIN (
        -- Calculate average cost per item for products
        SELECT 
            sp."Id" as product_id,
            AVG(spv."CostPerItem") as avg_cost_per_item
        FROM "ShopifyProducts" sp
        LEFT JOIN "ShopifyProductVariants" spv ON spv."ProductId" = sp."Id" 
            AND spv."CostPerItem" IS NOT NULL AND spv."CostPerItem" > 0
        GROUP BY sp."Id"
    ) avg_cost ON avg_cost.product_id = spv."ProductId"
    WHERE so."FulfillmentStatus" ILIKE 'fulfilled'
        AND so."DisplayFinancialStatus" NOT IN ('cancelled', 'voided', 'refunded')
        AND (p_start_date IS NULL OR so."CreatedAt" >= p_start_date)
        AND (p_end_date IS NULL OR so."CreatedAt" <= p_end_date)
        AND (p_currency IS NULL OR so."Currency" = p_currency)
        AND (p_platform IS NULL OR p_platform = 'shopify');
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Get COGS Summary (Simplified version) - Shopify Only
-- =============================================
CREATE OR REPLACE FUNCTION GetCOGSSummary(
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_currency VARCHAR(10) DEFAULT NULL
)
RETURNS TABLE (
    total_revenue DECIMAL(18,2),
    total_orders INTEGER,
    total_cost_of_goods DECIMAL(18,2),
    total_profit DECIMAL(18,2),
    gross_margin DECIMAL(10,2),
    average_order_value DECIMAL(18,2),
    average_cost_per_order DECIMAL(18,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(so."TotalPrice"), 0) as total_revenue,
        COUNT(*)::INTEGER as total_orders,
        COALESCE(SUM(
            CASE 
                WHEN spc."CostPrice" IS NOT NULL AND spc."CostPrice" > 0
                THEN CAST(li_data.line_item->>'quantity' AS INTEGER) * spc."CostPrice"
                WHEN spv."CostPerItem" IS NOT NULL AND spv."CostPerItem" > 0
                THEN CAST(li_data.line_item->>'quantity' AS INTEGER) * spv."CostPerItem"
                WHEN CAST(li_data.line_item->'variant'->>'cost' AS DECIMAL) > 0
                THEN CAST(li_data.line_item->>'quantity' AS INTEGER) * CAST(li_data.line_item->'variant'->>'cost' AS DECIMAL)
                WHEN avg_cost.avg_cost_per_item IS NOT NULL AND avg_cost.avg_cost_per_item > 0
                THEN CAST(li_data.line_item->>'quantity' AS INTEGER) * avg_cost.avg_cost_per_item
                ELSE CAST(li_data.line_item->>'quantity' AS INTEGER) * (CAST(li_data.line_item->'variant'->>'price' AS DECIMAL) * 0.6)
            END
        ), 0) as total_cost_of_goods,
        COALESCE(SUM(so."TotalPrice"), 0) - COALESCE(SUM(
            CASE 
                WHEN spc."CostPrice" IS NOT NULL AND spc."CostPrice" > 0
                THEN CAST(li_data.line_item->>'quantity' AS INTEGER) * spc."CostPrice"
                WHEN spv."CostPerItem" IS NOT NULL AND spv."CostPerItem" > 0
                THEN CAST(li_data.line_item->>'quantity' AS INTEGER) * spv."CostPerItem"
                WHEN CAST(li_data.line_item->'variant'->>'cost' AS DECIMAL) > 0
                THEN CAST(li_data.line_item->>'quantity' AS INTEGER) * CAST(li_data.line_item->'variant'->>'cost' AS DECIMAL)
                WHEN avg_cost.avg_cost_per_item IS NOT NULL AND avg_cost.avg_cost_per_item > 0
                THEN CAST(li_data.line_item->>'quantity' AS INTEGER) * avg_cost.avg_cost_per_item
                ELSE CAST(li_data.line_item->>'quantity' AS INTEGER) * (CAST(li_data.line_item->'variant'->>'price' AS DECIMAL) * 0.6)
            END
        ), 0) as total_profit,
        CASE 
            WHEN COALESCE(SUM(so."TotalPrice"), 0) > 0 
            THEN ((COALESCE(SUM(so."TotalPrice"), 0) - COALESCE(SUM(
                CASE 
                    WHEN spc."CostPrice" IS NOT NULL AND spc."CostPrice" > 0
                    THEN CAST(li_data.line_item->>'quantity' AS INTEGER) * spc."CostPrice"
                    WHEN spv."CostPerItem" IS NOT NULL AND spv."CostPerItem" > 0
                    THEN CAST(li_data.line_item->>'quantity' AS INTEGER) * spv."CostPerItem"
                    WHEN CAST(li_data.line_item->'variant'->>'cost' AS DECIMAL) > 0
                    THEN CAST(li_data.line_item->>'quantity' AS INTEGER) * CAST(li_data.line_item->'variant'->>'cost' AS DECIMAL)
                    WHEN avg_cost.avg_cost_per_item IS NOT NULL AND avg_cost.avg_cost_per_item > 0
                    THEN CAST(li_data.line_item->>'quantity' AS INTEGER) * avg_cost.avg_cost_per_item
                    ELSE CAST(li_data.line_item->>'quantity' AS INTEGER) * (CAST(li_data.line_item->'variant'->>'price' AS DECIMAL) * 0.6)
                END
            ), 0)) / COALESCE(SUM(so."TotalPrice"), 0)) * 100
            ELSE 0 
        END as gross_margin,
        CASE 
            WHEN COUNT(*) > 0 
            THEN COALESCE(SUM(so."TotalPrice"), 0) / COUNT(*)::DECIMAL
            ELSE 0 
        END as average_order_value,
        CASE 
            WHEN COUNT(*) > 0 
            THEN COALESCE(SUM(
                CASE 
                    WHEN spc."CostPrice" IS NOT NULL AND spc."CostPrice" > 0
                    THEN CAST(li_data.line_item->>'quantity' AS INTEGER) * spc."CostPrice"
                    WHEN spv."CostPerItem" IS NOT NULL AND spv."CostPerItem" > 0
                    THEN CAST(li_data.line_item->>'quantity' AS INTEGER) * spv."CostPerItem"
                    WHEN CAST(li_data.line_item->'variant'->>'cost' AS DECIMAL) > 0
                    THEN CAST(li_data.line_item->>'quantity' AS INTEGER) * CAST(li_data.line_item->'variant'->>'cost' AS DECIMAL)
                    WHEN avg_cost.avg_cost_per_item IS NOT NULL AND avg_cost.avg_cost_per_item > 0
                    THEN CAST(li_data.line_item->>'quantity' AS INTEGER) * avg_cost.avg_cost_per_item
                    ELSE CAST(li_data.line_item->>'quantity' AS INTEGER) * (CAST(li_data.line_item->'variant'->>'price' AS DECIMAL) * 0.6)
                END
            ), 0) / COUNT(*)::DECIMAL
            ELSE 0 
        END as average_cost_per_order
    FROM "ShopifyOrders" so
    LEFT JOIN LATERAL (
        SELECT 
            jsonb_array_elements(so."LineItemsJson"::jsonb) as line_item
    ) li_data ON true
    LEFT JOIN "ShopifyProductVariants" spv ON spv."Sku" = li_data.line_item->>'sku'
    LEFT JOIN "ProductCosts" spc ON spc."ProductId" = spv."ProductId"::TEXT 
        AND (spc."Sku" = spv."Sku")
    LEFT JOIN (
        SELECT 
            sp."Id" as product_id,
            AVG(spv."CostPerItem") as avg_cost_per_item
        FROM "ShopifyProducts" sp
        LEFT JOIN "ShopifyProductVariants" spv ON spv."ProductId" = sp."Id" 
            AND spv."CostPerItem" IS NOT NULL AND spv."CostPerItem" > 0
        GROUP BY sp."Id"
    ) avg_cost ON avg_cost.product_id = spv."ProductId"
    WHERE so."FulfillmentStatus" ILIKE 'fulfilled'
        AND so."DisplayFinancialStatus" NOT IN ('cancelled', 'voided', 'refunded')
        AND (p_start_date IS NULL OR so."CreatedAt" >= p_start_date)
        AND (p_end_date IS NULL OR so."CreatedAt" <= p_end_date)
        AND (p_currency IS NULL OR so."Currency" = p_currency);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Grant Permissions
-- =============================================
GRANT EXECUTE ON FUNCTION GetCostOfGoodsSold TO PUBLIC;
GRANT EXECUTE ON FUNCTION GetCOGSSummary TO PUBLIC; 