-- Deploy optimized GetTopSellingProducts stored procedure
-- This script updates the stored procedure to eliminate individual database queries

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS GetTopSellingProducts(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, VARCHAR(10), INTEGER);

-- Create the optimized function
CREATE OR REPLACE FUNCTION GetTopSellingProducts(
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_currency VARCHAR(10) DEFAULT NULL,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    product_name VARCHAR(255),
    product_id VARCHAR(255),
    image_url TEXT,
    total_quantity INTEGER,
    total_revenue DECIMAL(18,2),
    total_cost DECIMAL(18,2),
    total_profit DECIMAL(18,2),
    margin_percentage DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH order_line_items AS (
        -- Extract all line items from orders in a single pass
        SELECT 
            so."Id" as order_id,
            so."CreatedAt" as order_date,
            so."Currency" as currency,
            (li_data.line_item->>'title') as product_title,
            (li_data.line_item->>'variant_id') as variant_id,
            (li_data.line_item->>'sku') as sku,
            CAST(li_data.line_item->>'quantity' AS INTEGER) as quantity,
            CAST(li_data.line_item->>'price' AS DECIMAL) as price,
            (CAST(li_data.line_item->>'quantity' AS INTEGER) * CAST(li_data.line_item->>'price' AS DECIMAL)) as line_total
        FROM "ShopifyOrders" so
        LEFT JOIN LATERAL (
            SELECT 
                jsonb_array_elements(so."LineItemsJson"::jsonb) as line_item
        ) li_data ON true
        WHERE so."FulfillmentStatus" ILIKE 'fulfilled'
            AND so."DisplayFinancialStatus" NOT IN ('cancelled', 'voided', 'refunded')
            AND (p_start_date IS NULL OR so."CreatedAt" >= p_start_date)
            AND (p_end_date IS NULL OR so."CreatedAt" <= p_end_date)
            AND (p_currency IS NULL OR so."Currency" = p_currency)
    ),
    product_sales AS (
        -- Aggregate sales by product
        SELECT 
            oli.product_title,
            SUM(oli.quantity) as total_quantity,
            SUM(oli.line_total) as total_revenue,
            COUNT(DISTINCT oli.order_id) as order_count
        FROM order_line_items oli
        WHERE oli.product_title IS NOT NULL
        GROUP BY oli.product_title
    ),
    product_costs AS (
        -- Calculate costs using multiple matching strategies
        SELECT 
            oli.product_title,
            SUM(
                CASE 
                    -- Strategy 1: Match by SKU first
                    WHEN spv."Sku" IS NOT NULL AND spv."CostPerItem" IS NOT NULL 
                    THEN oli.quantity * spv."CostPerItem"
                    -- Strategy 2: Match by variant ID
                    WHEN spv."ShopifyVariantId"::TEXT = oli.variant_id AND spv."CostPerItem" IS NOT NULL
                    THEN oli.quantity * spv."CostPerItem"
                    -- Strategy 3: Match by product title and any variant with cost
                    WHEN sp."Title" = oli.product_title AND spv."CostPerItem" IS NOT NULL
                    THEN oli.quantity * spv."CostPerItem"
                    -- Strategy 4: Use average cost for the product if available
                    WHEN sp."Title" = oli.product_title AND avg_cost.avg_cost_per_item IS NOT NULL
                    THEN oli.quantity * avg_cost.avg_cost_per_item
                    ELSE 0
                END
            ) as total_cost
        FROM order_line_items oli
        LEFT JOIN "ShopifyProducts" sp ON sp."Title" = oli.product_title
        LEFT JOIN "ShopifyProductVariants" spv ON spv."ProductId" = sp."Id"
        LEFT JOIN (
            -- Calculate average cost per item for products
            SELECT 
                sp."Id" as product_id,
                AVG(spv."CostPerItem") as avg_cost_per_item
            FROM "ShopifyProducts" sp
            LEFT JOIN "ShopifyProductVariants" spv ON spv."ProductId" = sp."Id" 
                AND spv."CostPerItem" IS NOT NULL
            GROUP BY sp."Id"
        ) avg_cost ON avg_cost.product_id = sp."Id"
        WHERE oli.product_title IS NOT NULL
        GROUP BY oli.product_title
    ),
    product_details AS (
        -- Get product details
        SELECT 
            sp."Title" as product_title,
            sp."ShopifyProductId" as product_id,
            sp."ImageUrl" as image_url
        FROM "ShopifyProducts" sp
        WHERE sp."Title" IN (SELECT product_title FROM product_sales)
    )
    SELECT 
        ps.product_title::VARCHAR(255),
        pd.product_id::VARCHAR(255),
        pd.image_url::TEXT,
        ps.total_quantity::INTEGER,
        ps.total_revenue::DECIMAL(18,2),
        COALESCE(pc.total_cost, 0)::DECIMAL(18,2),
        (ps.total_revenue - COALESCE(pc.total_cost, 0))::DECIMAL(18,2),
        CASE 
            WHEN ps.total_revenue > 0 THEN 
                ((ps.total_revenue - COALESCE(pc.total_cost, 0)) / ps.total_revenue) * 100
            ELSE 0 
        END::DECIMAL(10,2)
    FROM product_sales ps
    LEFT JOIN product_costs pc ON pc.product_title = ps.product_title
    LEFT JOIN product_details pd ON pd.product_title = ps.product_title
    ORDER BY ps.total_revenue DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Test the function
SELECT 'Function deployed successfully' as status; 