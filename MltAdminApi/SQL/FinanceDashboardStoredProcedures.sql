-- Finance Dashboard Optimized Stored Procedures
-- These procedures replace the complex C# queries for better performance

-- =============================================
-- Get Finance Dashboard Summary (Simplified)
-- =============================================
CREATE OR REPLACE FUNCTION GetFinanceDashboardSummary(
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_currency VARCHAR(10) DEFAULT NULL
)
RETURNS TABLE (
    total_revenue DECIMAL(18,2),
    total_orders INTEGER,
    average_order_value DECIMAL(18,2),
    total_cost_of_goods DECIMAL(18,2),
    total_profit DECIMAL(18,2),
    gross_margin DECIMAL(18,2),
    total_expenses DECIMAL(18,2),
    approved_expenses DECIMAL(18,2),
    pending_expenses DECIMAL(18,2),
    income DECIMAL(18,2),
    profit DECIMAL(18,2),
    loss DECIMAL(18,2),
    net_margin DECIMAL(18,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH shopify_analytics AS (
        SELECT 
            COALESCE(SUM(so."TotalPrice"), 0) as revenue,
            COUNT(*)::INTEGER as orders,
            CASE 
                WHEN COUNT(*) > 0 THEN COALESCE(SUM(so."TotalPrice"), 0) / COUNT(*)::DECIMAL
                ELSE 0 
            END as avg_order_value,
            COALESCE(SUM(COALESCE(spc."CostPrice", 0) * COALESCE(CAST(li->>'quantity' AS INTEGER), 0)), 0) as cost_of_goods
        FROM "ShopifyOrders" so
        LEFT JOIN LATERAL (
            SELECT 
                jsonb_array_elements(so."LineItemsJson"::jsonb) as line_item
        ) li_data ON true
        LEFT JOIN LATERAL (
            SELECT 
                li_data.line_item->>'variant_id' as variant_id,
                CAST(li_data.line_item->>'quantity' AS INTEGER) as quantity
        ) li ON true
        LEFT JOIN "ShopifyProductVariants" spv ON spv."ShopifyVariantId" = li.variant_id
        LEFT JOIN "ProductCosts" spc ON spc."ProductId" = spv."ProductId"::TEXT AND spc."Sku" = spv."Sku"
        WHERE so."FulfillmentStatus" ILIKE 'fulfilled'
            AND so."DisplayFinancialStatus" NOT IN ('cancelled', 'voided', 'refunded')
            AND (p_start_date IS NULL OR so."CreatedAt" >= p_start_date)
            AND (p_end_date IS NULL OR so."CreatedAt" <= p_end_date)
            AND (p_currency IS NULL OR so."Currency" = p_currency)
    ),
    expense_summary AS (
        SELECT 
            COALESCE(SUM(e."Amount"), 0) as total_expenses,
            COALESCE(SUM(CASE WHEN e."Status" = 'approved' THEN e."Amount" ELSE 0 END), 0) as approved_expenses,
            COALESCE(SUM(CASE WHEN e."Status" = 'pending' THEN e."Amount" ELSE 0 END), 0) as pending_expenses
        FROM "Expenses" e
        WHERE (p_start_date IS NULL OR e."Date" >= p_start_date)
            AND (p_end_date IS NULL OR e."Date" <= p_end_date)
    )
    SELECT 
        sa.revenue as total_revenue,
        sa.orders as total_orders,
        sa.avg_order_value as average_order_value,
        sa.cost_of_goods as total_cost_of_goods,
        (sa.revenue - sa.cost_of_goods) as total_profit,
        CASE 
            WHEN sa.revenue > 0 THEN ((sa.revenue - sa.cost_of_goods) / sa.revenue) * 100
            ELSE 0 
        END as gross_margin,
        es.total_expenses,
        es.approved_expenses,
        es.pending_expenses,
        (sa.revenue - es.total_expenses) as income,
        (sa.revenue - es.total_expenses) as profit,
        CASE 
            WHEN es.total_expenses > sa.revenue THEN (es.total_expenses - sa.revenue)
            ELSE 0 
        END as loss,
        CASE 
            WHEN sa.revenue > 0 THEN ((sa.revenue - es.total_expenses) / sa.revenue) * 100
            ELSE 0 
        END as net_margin
    FROM shopify_analytics sa
    CROSS JOIN expense_summary es;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Get Recent Analytics Data
-- =============================================
CREATE OR REPLACE FUNCTION GetRecentAnalytics(
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id INTEGER,
    date TIMESTAMP WITH TIME ZONE,
    revenue DECIMAL(18,2),
    orders INTEGER,
    average_order_value DECIMAL(18,2),
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sa."Id",
        sa."Date",
        sa."Revenue",
        sa."Orders",
        sa."AverageOrderValue",
        sa."CreatedAt"
    FROM "SalesAnalytics" sa
    ORDER BY sa."Date" DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Get Recent Expenses
-- =============================================
CREATE OR REPLACE FUNCTION GetRecentExpenses(
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    id INTEGER,
    type VARCHAR(100),
    category VARCHAR(100),
    description TEXT,
    amount DECIMAL(18,2),
    currency VARCHAR(10),
    date TIMESTAMP WITH TIME ZONE,
    payment_mode VARCHAR(100),
    paid_to VARCHAR(255),
    chart_of_account_code VARCHAR(50),
    chart_of_account_name VARCHAR(255),
    tags JSONB,
    receipt_url TEXT,
    created_by VARCHAR(255),
    status VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e."Id",
        e."Type",
        e."Category",
        e."Description",
        e."Amount",
        e."Currency",
        e."Date",
        e."PaymentMode",
        e."PaidTo",
        e."ChartOfAccountCode",
        e."ChartOfAccountName",
        e."Tags",
        e."ReceiptUrl",
        e."CreatedBy",
        e."Status",
        e."Notes",
        e."CreatedAt",
        e."UpdatedAt"
    FROM "Expenses" e
    ORDER BY e."Date" DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Get Approved Expenses Breakdown
-- =============================================
CREATE OR REPLACE FUNCTION GetApprovedExpensesBreakdown(
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
    id INTEGER,
    type VARCHAR(100),
    category VARCHAR(100),
    description TEXT,
    amount DECIMAL(18,2),
    currency VARCHAR(10),
    date TIMESTAMP WITH TIME ZONE,
    payment_mode VARCHAR(100),
    paid_to VARCHAR(255),
    chart_of_account_code VARCHAR(50),
    chart_of_account_name VARCHAR(255),
    tags JSONB,
    receipt_url TEXT,
    created_by VARCHAR(255),
    status VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e."Id",
        e."Type",
        e."Category",
        e."Description",
        e."Amount",
        e."Currency",
        e."Date",
        e."PaymentMode",
        e."PaidTo",
        e."ChartOfAccountCode",
        e."ChartOfAccountName",
        e."Tags",
        e."ReceiptUrl",
        e."CreatedBy",
        e."Status",
        e."Notes",
        e."CreatedAt",
        e."UpdatedAt"
    FROM "Expenses" e
    WHERE e."Status" = 'approved'
        AND (p_start_date IS NULL OR e."Date" >= p_start_date)
        AND (p_end_date IS NULL OR e."Date" <= p_end_date)
    ORDER BY e."Date" DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Get Platform Breakdown
-- =============================================
CREATE OR REPLACE FUNCTION GetPlatformBreakdown(
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_currency VARCHAR(10) DEFAULT NULL
)
RETURNS TABLE (
    platform VARCHAR(50),
    revenue DECIMAL(18,2),
    orders INTEGER,
    profit DECIMAL(18,2)
) AS $$
BEGIN
    RETURN QUERY
    -- Shopify only
    SELECT 
        'Shopify' as platform,
        COALESCE(SUM(so."TotalPrice"), 0) as revenue,
        COUNT(*) as orders,
        COALESCE(SUM(so."TotalPrice" - COALESCE(spc."CostPrice", 0) * COALESCE(CAST(li->>'quantity' AS INTEGER), 0)), 0) as profit
    FROM "ShopifyOrders" so
    LEFT JOIN LATERAL (
        SELECT 
            jsonb_array_elements(so."LineItemsJson"::jsonb) as line_item
    ) li_data ON true
    LEFT JOIN LATERAL (
        SELECT 
            li_data.line_item->>'variant_id' as variant_id,
            CAST(li_data.line_item->>'quantity' AS INTEGER) as quantity
    ) li ON true
    LEFT JOIN "ShopifyProductVariants" spv ON spv."ShopifyVariantId" = li.variant_id
    LEFT JOIN "ProductCosts" spc ON spc."ProductId" = spv."ProductId"::TEXT AND spc."Sku" = spv."Sku"
    WHERE so."FulfillmentStatus" ILIKE 'fulfilled'
        AND so."DisplayFinancialStatus" NOT IN ('cancelled', 'voided', 'refunded')
        AND (p_start_date IS NULL OR so."CreatedAt" >= p_start_date)
        AND (p_end_date IS NULL OR so."CreatedAt" <= p_end_date)
        AND (p_currency IS NULL OR so."Currency" = p_currency);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Get Sales Analytics with Breakdown
-- =============================================
CREATE OR REPLACE FUNCTION GetSalesAnalytics(
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_currency VARCHAR(10) DEFAULT NULL
)
RETURNS TABLE (
    total_revenue DECIMAL(18,2),
    total_orders INTEGER,
    average_order_value DECIMAL(18,2),
    total_cost_of_goods DECIMAL(18,2),
    total_profit DECIMAL(18,2),
    gross_margin DECIMAL(18,2),
    revenue_by_day JSONB,
    revenue_by_month JSONB,
    top_products JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH shopify_analytics AS (
        SELECT 
            COALESCE(SUM(so."TotalPrice"), 0) as revenue,
            COUNT(*) as orders,
            CASE 
                WHEN COUNT(*) > 0 THEN COALESCE(SUM(so."TotalPrice"), 0) / COUNT(*)::DECIMAL
                ELSE 0 
            END as avg_order_value,
            COALESCE(SUM(COALESCE(spc."CostPrice", 0) * COALESCE(CAST(li->>'quantity' AS INTEGER), 0)), 0) as cost_of_goods
        FROM "ShopifyOrders" so
        LEFT JOIN LATERAL (
            SELECT 
                jsonb_array_elements(so."LineItemsJson"::jsonb) as line_item
        ) li_data ON true
        LEFT JOIN LATERAL (
            SELECT 
                li_data.line_item->>'variant_id' as variant_id,
                CAST(li_data.line_item->>'quantity' AS INTEGER) as quantity
        ) li ON true
        LEFT JOIN "ShopifyProductVariants" spv ON spv."ShopifyVariantId" = li.variant_id
        LEFT JOIN "ProductCosts" spc ON spc."ProductId" = spv."ProductId"::TEXT AND spc."Sku" = spv."Sku"
        WHERE so."FulfillmentStatus" ILIKE 'fulfilled'
            AND so."DisplayFinancialStatus" NOT IN ('cancelled', 'voided', 'refunded')
            AND (p_start_date IS NULL OR so."CreatedAt" >= p_start_date)
            AND (p_end_date IS NULL OR so."CreatedAt" <= p_end_date)
            AND (p_currency IS NULL OR so."Currency" = p_currency)
    ),
    revenue_daily AS (
        SELECT 
            DATE(so."CreatedAt") as date,
            SUM(so."TotalPrice") as revenue,
            COUNT(*) as orders
        FROM "ShopifyOrders" so
        WHERE so."FulfillmentStatus" ILIKE 'fulfilled'
            AND so."DisplayFinancialStatus" NOT IN ('cancelled', 'voided', 'refunded')
            AND (p_start_date IS NULL OR so."CreatedAt" >= p_start_date)
            AND (p_end_date IS NULL OR so."CreatedAt" <= p_end_date)
            AND (p_currency IS NULL OR so."Currency" = p_currency)
        GROUP BY DATE(so."CreatedAt")
        ORDER BY date
    ),
    revenue_monthly AS (
        SELECT 
            DATE_TRUNC('month', so."CreatedAt") as month,
            SUM(so."TotalPrice") as revenue,
            COUNT(*) as orders
        FROM "ShopifyOrders" so
        WHERE so."FulfillmentStatus" ILIKE 'fulfilled'
            AND so."DisplayFinancialStatus" NOT IN ('cancelled', 'voided', 'refunded')
            AND (p_start_date IS NULL OR so."CreatedAt" >= p_start_date)
            AND (p_end_date IS NULL OR so."CreatedAt" <= p_end_date)
            AND (p_currency IS NULL OR so."Currency" = p_currency)
        GROUP BY DATE_TRUNC('month', so."CreatedAt")
        ORDER BY month
    ),
    top_products_data AS (
        SELECT 
            li->>'title' as product_title,
            SUM(CAST(li->>'quantity' AS INTEGER)) as total_quantity,
            SUM(CAST(li->>'quantity' AS INTEGER) * CAST(li->>'price' AS DECIMAL)) as total_revenue
        FROM "ShopifyOrders" so
        LEFT JOIN LATERAL (
            SELECT 
                jsonb_array_elements(so."LineItemsJson"::jsonb) as line_item
        ) li_data ON true
        LEFT JOIN LATERAL (
            SELECT 
                li_data.line_item->>'title' as title,
                li_data.line_item->>'quantity' as quantity,
                li_data.line_item->>'price' as price
        ) li ON true
        WHERE so."FulfillmentStatus" ILIKE 'fulfilled'
            AND so."DisplayFinancialStatus" NOT IN ('cancelled', 'voided', 'refunded')
            AND (p_start_date IS NULL OR so."CreatedAt" >= p_start_date)
            AND (p_end_date IS NULL OR so."CreatedAt" <= p_end_date)
            AND (p_currency IS NULL OR so."Currency" = p_currency)
        GROUP BY li->>'title'
        ORDER BY total_revenue DESC
        LIMIT 10
    )
    SELECT 
        sa.revenue as total_revenue,
        sa.orders as total_orders,
        sa.avg_order_value as average_order_value,
        sa.cost_of_goods as total_cost_of_goods,
        (sa.revenue - sa.cost_of_goods) as total_profit,
        CASE 
            WHEN sa.revenue > 0 THEN ((sa.revenue - sa.cost_of_goods) / sa.revenue) * 100
            ELSE 0 
        END as gross_margin,
        (SELECT jsonb_agg(
            jsonb_build_object(
                'date', rd.date,
                'revenue', rd.revenue,
                'orders', rd.orders
            )
        ) FROM revenue_daily rd) as revenue_by_day,
        (SELECT jsonb_agg(
            jsonb_build_object(
                'month', rm.month,
                'revenue', rm.revenue,
                'orders', rm.orders
            )
        ) FROM revenue_monthly rm) as revenue_by_month,
        (SELECT jsonb_agg(
            jsonb_build_object(
                'product_title', tpd.product_title,
                'total_quantity', tpd.total_quantity,
                'total_revenue', tpd.total_revenue
            )
        ) FROM top_products_data tpd) as top_products
    FROM shopify_analytics sa;
END;
$$ LANGUAGE plpgsql; 

-- =============================================
-- Get Top Selling Products (With Cost Calculation)
-- =============================================
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
        -- Extract all line items from orders
        SELECT 
            so."Id" as order_id,
            so."CreatedAt" as order_date,
            so."Currency" as currency,
            jsonb_array_elements(so."LineItemsJson"::jsonb)->>'title' as product_title,
            jsonb_array_elements(so."LineItemsJson"::jsonb)->'variant'->>'id' as variant_id,
            jsonb_array_elements(so."LineItemsJson"::jsonb)->>'sku' as sku,
            CAST(jsonb_array_elements(so."LineItemsJson"::jsonb)->>'quantity' AS INTEGER) as quantity,
            CAST(jsonb_array_elements(so."LineItemsJson"::jsonb)->>'originalTotalSet' AS DECIMAL) as price
        FROM "ShopifyOrders" so
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
            SUM(oli.quantity * oli.price) as total_revenue,
            COUNT(DISTINCT oli.order_id) as order_count
        FROM order_line_items oli
        WHERE oli.product_title IS NOT NULL
        GROUP BY oli.product_title
    ),
    product_costs AS (
        -- Calculate costs using multiple strategies
        SELECT 
            oli.product_title,
            SUM(
                CASE 
                    -- Strategy 1: Use CostPerItem from ShopifyProductVariants
                    WHEN spv."CostPerItem" IS NOT NULL AND spv."CostPerItem" > 0
                    THEN oli.quantity * spv."CostPerItem"
                    -- Strategy 2: Use ProductCosts table
                    WHEN pc."CostPrice" IS NOT NULL AND pc."CostPrice" > 0
                    THEN oli.quantity * pc."CostPrice"
                    -- Strategy 3: Use average cost for the product
                    WHEN avg_cost.avg_cost_per_item IS NOT NULL AND avg_cost.avg_cost_per_item > 0
                    THEN oli.quantity * avg_cost.avg_cost_per_item
                    -- Strategy 4: Default to 60% of selling price as cost
                    ELSE oli.quantity * (oli.price * 0.6)
                END
            ) as total_cost
        FROM order_line_items oli
        LEFT JOIN "ShopifyProducts" sp ON sp."Title" = oli.product_title
        LEFT JOIN "ShopifyProductVariants" spv ON spv."ProductId" = sp."Id" 
            AND (spv."Sku" = oli.sku OR spv."ShopifyVariantId"::TEXT = oli.variant_id)
        LEFT JOIN "ProductCosts" pc ON pc."ProductId" = sp."Id"::TEXT 
            AND (pc."Sku" = oli.sku OR pc."Sku" = spv."Sku")
        LEFT JOIN (
            -- Calculate average cost per item for products
            SELECT 
                sp."Id" as product_id,
                AVG(spv."CostPerItem") as avg_cost_per_item
            FROM "ShopifyProducts" sp
            LEFT JOIN "ShopifyProductVariants" spv ON spv."ProductId" = sp."Id" 
                AND spv."CostPerItem" IS NOT NULL AND spv."CostPerItem" > 0
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
        COALESCE(pd.product_id, '')::VARCHAR(255),
        COALESCE(pd.image_url, '')::TEXT,
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

-- =============================================
-- Populate Product Costs (Sample Data)
-- =============================================
CREATE OR REPLACE FUNCTION PopulateProductCosts()
RETURNS VOID AS $$
BEGIN
    -- Clear existing data
    DELETE FROM "ProductCosts";
    
    -- Insert sample cost data for products
    INSERT INTO "ProductCosts" (
        "Id", "ProductId", "VariantId", "Sku", "CostPrice", "Currency", "Supplier", "Notes", "LastUpdatedBy", "CreatedAt", "UpdatedAt"
    )
    SELECT 
        'cost_' || sp."Id"::TEXT as id,
        sp."Id"::TEXT as product_id,
        spv."Id"::TEXT as variant_id,
        spv."Sku" as sku,
        CASE 
            WHEN spv."Price" > 0 THEN spv."Price" * 0.6 -- 60% of selling price as cost
            ELSE 100.00 -- Default cost
        END as cost_price,
        'INR' as currency,
        'Sample Supplier' as supplier,
        'Auto-generated sample cost data' as notes,
        'system' as last_updated_by,
        NOW() as created_at,
        NOW() as updated_at
    FROM "ShopifyProducts" sp
    LEFT JOIN "ShopifyProductVariants" spv ON spv."ProductId" = sp."Id"
    WHERE spv."Sku" IS NOT NULL AND spv."Sku" != ''
    LIMIT 100; -- Limit to first 100 products
    
    RAISE NOTICE 'ProductCosts table populated with sample data';
END;
$$ LANGUAGE plpgsql; 

-- =============================================
-- Get Comprehensive Sales Analytics
-- =============================================
CREATE OR REPLACE FUNCTION GetComprehensiveSalesAnalytics(
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_currency VARCHAR(10) DEFAULT NULL
)
RETURNS TABLE (
    total_revenue DECIMAL(18,2),
    total_orders INTEGER,
    average_order_value DECIMAL(18,2),
    total_cost_of_goods DECIMAL(18,2),
    total_profit DECIMAL(18,2),
    gross_margin DECIMAL(18,2),
    revenue_growth DECIMAL(18,2),
    order_growth DECIMAL(18,2),
    platform_breakdown JSONB,
    top_products JSONB,
    revenue_by_month JSONB,
    customer_metrics JSONB,
    date_range_info JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH shopify_analytics AS (
        SELECT 
            COALESCE(SUM(so."TotalPrice"), 0) as revenue,
            COUNT(*) as orders,
            CASE 
                WHEN COUNT(*) > 0 THEN COALESCE(SUM(so."TotalPrice"), 0) / COUNT(*)::DECIMAL
                ELSE 0 
            END as avg_order_value,
            COALESCE(SUM(COALESCE(spc."CostPrice", 0) * COALESCE(CAST(li->>'quantity' AS INTEGER), 0)), 0) as cost_of_goods
        FROM "ShopifyOrders" so
        LEFT JOIN LATERAL (
            SELECT 
                jsonb_array_elements(so."LineItemsJson"::jsonb) as line_item
        ) li_data ON true
        LEFT JOIN LATERAL (
            SELECT 
                li_data.line_item->>'variant_id' as variant_id,
                CAST(li_data.line_item->>'quantity' AS INTEGER) as quantity
        ) li ON true
        LEFT JOIN "ShopifyProductVariants" spv ON spv."ShopifyVariantId" = li.variant_id
        LEFT JOIN "ProductCosts" spc ON spc."ProductId" = spv."ProductId"::TEXT AND spc."Sku" = spv."Sku"
        WHERE so."FulfillmentStatus" ILIKE 'fulfilled'
            AND so."DisplayFinancialStatus" NOT IN ('cancelled', 'voided', 'refunded')
            AND (p_start_date IS NULL OR so."CreatedAt" >= p_start_date)
            AND (p_end_date IS NULL OR so."CreatedAt" <= p_end_date)
            AND (p_currency IS NULL OR so."Currency" = p_currency)
    ),
    combined_analytics AS (
        SELECT 
            sa.revenue as total_revenue,
            sa.orders as total_orders,
            CASE 
                WHEN sa.orders > 0 
                THEN sa.revenue / sa.orders::DECIMAL
                ELSE 0 
            END as average_order_value,
            sa.cost_of_goods as total_cost_of_goods,
            sa.revenue - sa.cost_of_goods as total_profit,
            CASE 
                WHEN sa.revenue > 0 
                THEN ((sa.revenue - sa.cost_of_goods) / sa.revenue) * 100
                ELSE 0 
            END as gross_margin
        FROM shopify_analytics sa
    ),
    revenue_by_month_data AS (
        SELECT 
            DATE_TRUNC('month', so."CreatedAt") as month,
            SUM(so."TotalPrice") as revenue,
            COUNT(*) as orders
        FROM "ShopifyOrders" so
        WHERE so."FulfillmentStatus" ILIKE 'fulfilled'
            AND so."DisplayFinancialStatus" NOT IN ('cancelled', 'voided', 'refunded')
            AND (p_start_date IS NULL OR so."CreatedAt" >= p_start_date)
            AND (p_end_date IS NULL OR so."CreatedAt" <= p_end_date)
            AND (p_currency IS NULL OR so."Currency" = p_currency)
        GROUP BY DATE_TRUNC('month', so."CreatedAt")
    ),
    aggregated_monthly_revenue AS (
        SELECT 
            month,
            revenue,
            orders
        FROM revenue_by_month_data
        ORDER BY month
    ),
    top_products_data AS (
        SELECT 
            li->>'title' as product_title,
            SUM(CAST(li->>'quantity' AS INTEGER)) as total_quantity,
            SUM(CAST(li->>'quantity' AS INTEGER) * CAST(li->>'price' AS DECIMAL)) as total_revenue,
            COALESCE(spc."CostPrice", 0) as cost_price,
            SUM(CAST(li->>'quantity' AS INTEGER) * CAST(li->>'price' AS DECIMAL)) - 
            SUM(CAST(li->>'quantity' AS INTEGER) * COALESCE(spc."CostPrice", 0)) as profit,
            CASE 
                WHEN SUM(CAST(li->>'quantity' AS INTEGER) * CAST(li->>'price' AS DECIMAL)) > 0 
                THEN ((SUM(CAST(li->>'quantity' AS INTEGER) * CAST(li->>'price' AS DECIMAL)) - 
                      SUM(CAST(li->>'quantity' AS INTEGER) * COALESCE(spc."CostPrice", 0))) / 
                     SUM(CAST(li->>'quantity' AS INTEGER) * CAST(li->>'price' AS DECIMAL)) * 100
                ELSE 0 
            END as margin
        FROM "ShopifyOrders" so
        LEFT JOIN LATERAL (
            SELECT 
                jsonb_array_elements(so."LineItemsJson"::jsonb) as line_item
        ) li_data ON true
        LEFT JOIN LATERAL (
            SELECT 
                li_data.line_item->>'title' as title,
                li_data.line_item->>'quantity' as quantity,
                li_data.line_item->>'price' as price,
                li_data.line_item->>'variant_id' as variant_id
        ) li ON true
        LEFT JOIN "ShopifyProductVariants" spv ON spv."ShopifyVariantId" = li.variant_id
        LEFT JOIN "ProductCosts" spc ON spc."ProductId" = spv."ProductId"::TEXT AND spc."Sku" = spv."Sku"
        WHERE so."FulfillmentStatus" ILIKE 'fulfilled'
            AND so."DisplayFinancialStatus" NOT IN ('cancelled', 'voided', 'refunded')
            AND (p_start_date IS NULL OR so."CreatedAt" >= p_start_date)
            AND (p_end_date IS NULL OR so."CreatedAt" <= p_end_date)
            AND (p_currency IS NULL OR so."Currency" = p_currency)
            AND li->>'title' IS NOT NULL
        GROUP BY li->>'title', spc."CostPrice"
        ORDER BY total_revenue DESC
        LIMIT 10
    ),
    customer_metrics_data AS (
        SELECT 
            COUNT(DISTINCT so."CustomerId") as total_customers,
            COUNT(DISTINCT CASE WHEN so."CreatedAt" >= COALESCE(p_start_date, so."CreatedAt" - INTERVAL '30 days') THEN so."CustomerId" END) as new_customers,
            COUNT(DISTINCT CASE WHEN so."CreatedAt" < COALESCE(p_start_date, so."CreatedAt" - INTERVAL '30 days') THEN so."CustomerId" END) as returning_customers
        FROM "ShopifyOrders" so
        WHERE so."FulfillmentStatus" ILIKE 'fulfilled'
            AND so."DisplayFinancialStatus" NOT IN ('cancelled', 'voided', 'refunded')
            AND (p_start_date IS NULL OR so."CreatedAt" >= p_start_date)
            AND (p_end_date IS NULL OR so."CreatedAt" <= p_end_date)
            AND (p_currency IS NULL OR so."Currency" = p_currency)
    ),
    growth_calculation AS (
        SELECT 
            -- Calculate growth compared to previous period
            CASE 
                WHEN p_start_date IS NOT NULL AND p_end_date IS NOT NULL THEN
                    -- Compare with same period length before the start date
                    (SELECT COALESCE(SUM(so."TotalPrice"), 0)
                     FROM "ShopifyOrders" so
                     WHERE so."FulfillmentStatus" ILIKE 'fulfilled'
                         AND so."DisplayFinancialStatus" NOT IN ('cancelled', 'voided', 'refunded')
                         AND so."CreatedAt" >= (p_start_date - (p_end_date - p_start_date))
                         AND so."CreatedAt" < p_start_date
                         AND (p_currency IS NULL OR so."Currency" = p_currency))
                ELSE 0
            END as previous_period_revenue,
            CASE 
                WHEN p_start_date IS NOT NULL AND p_end_date IS NOT NULL THEN
                    (SELECT COUNT(*)
                     FROM "ShopifyOrders" so
                     WHERE so."FulfillmentStatus" ILIKE 'fulfilled'
                         AND so."DisplayFinancialStatus" NOT IN ('cancelled', 'voided', 'refunded')
                         AND so."CreatedAt" >= (p_start_date - (p_end_date - p_start_date))
                         AND so."CreatedAt" < p_start_date
                         AND (p_currency IS NULL OR so."Currency" = p_currency))
                ELSE 0
            END as previous_period_orders
    )
    SELECT 
        ca.total_revenue,
        ca.total_orders,
        ca.average_order_value,
        ca.total_cost_of_goods,
        ca.total_profit,
        ca.gross_margin,
        CASE 
            WHEN gc.previous_period_revenue > 0 
            THEN ((ca.total_revenue - gc.previous_period_revenue) / gc.previous_period_revenue) * 100
            ELSE 0 
        END as revenue_growth,
        CASE 
            WHEN gc.previous_period_orders > 0 
            THEN ((ca.total_orders - gc.previous_period_orders) / gc.previous_period_orders) * 100
            ELSE 0 
        END as order_growth,
        jsonb_build_object(
            'shopify', jsonb_build_object(
                'revenue', sa.revenue,
                'orders', sa.orders,
                'profit', sa.revenue - sa.cost_of_goods
            )
        ) as platform_breakdown,
        (SELECT jsonb_agg(
            jsonb_build_object(
                'name', tpd.product_title,
                'quantity', tpd.total_quantity,
                'revenue', tpd.total_revenue,
                'cost', tpd.cost_price * tpd.total_quantity,
                'profit', tpd.profit,
                'margin', tpd.margin
            )
        ) FROM top_products_data tpd) as top_products,
        (SELECT jsonb_agg(
            jsonb_build_object(
                'month', amr.month,
                'revenue', amr.revenue,
                'orders', amr.orders
            )
        ) FROM aggregated_monthly_revenue amr) as revenue_by_month,
        (SELECT jsonb_build_object(
            'newCustomers', cmd.new_customers,
            'returningCustomers', cmd.returning_customers,
            'customerRetentionRate', 
                CASE 
                    WHEN cmd.total_customers > 0 
                    THEN (cmd.returning_customers::DECIMAL / cmd.total_customers) * 100
                    ELSE 0 
                END
        ) FROM customer_metrics_data cmd) as customer_metrics,
        jsonb_build_object(
            'startDate', p_start_date,
            'endDate', p_end_date,
            'totalOrdersInRange', ca.total_orders
        ) as date_range_info
    FROM combined_analytics ca
    CROSS JOIN shopify_analytics sa
    CROSS JOIN growth_calculation gc;
END;
$$ LANGUAGE plpgsql; 