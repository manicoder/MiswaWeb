-- =============================================
-- COMPREHENSIVE STORED PROCEDURES FOR MLT ADMIN API
-- This file contains ALL stored procedures used throughout the application
-- =============================================

-- =============================================
-- INVENTORY FUNCTIONS
-- =============================================

-- Function to get Shopify products with inventory using window functions
CREATE OR REPLACE FUNCTION GetShopifyProductsWithInventory(
    p_storeConnectionId UUID,
    p_search TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_inventoryFilter TEXT DEFAULT NULL,
    p_page INTEGER DEFAULT 1,
    p_pageSize INTEGER DEFAULT 50,
    p_showAll BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    "Id" UUID,
    "total_count" BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH filtered_products AS (
        SELECT 
            p."Id",
            p."Title",
            p."Status",
            p."ShopifyUpdatedAt",
            COALESCE(SUM(v."InventoryQuantity"), 0) as total_inventory,
            COUNT(*) OVER() as total_count
        FROM "ShopifyProducts" p
        LEFT JOIN "ShopifyProductVariants" v ON p."Id" = v."ProductId"
        WHERE p."StoreConnectionId" = p_storeConnectionId
            AND (p_search IS NULL OR p."Title" ILIKE '%' || p_search || '%')
            AND (p_status IS NULL OR LOWER(p."Status") = LOWER(p_status))
        GROUP BY p."Id", p."Title", p."Status", p."ShopifyUpdatedAt"
    ),
    ranked_products AS (
        SELECT 
            fp."Id",
            fp."total_count",
            ROW_NUMBER() OVER (
                ORDER BY fp."ShopifyUpdatedAt" DESC, fp."Id" DESC
            ) as row_num
        FROM filtered_products fp
        WHERE 
            (p_inventoryFilter IS NULL) OR
            (p_inventoryFilter = 'in-stock' AND fp.total_inventory > 0) OR
            (p_inventoryFilter = 'out-of-stock' AND fp.total_inventory = 0) OR
            (p_inventoryFilter = 'low-stock' AND fp.total_inventory > 0 AND fp.total_inventory <= 10)
    )
    SELECT 
        rp."Id",
        rp."total_count"
    FROM ranked_products rp
    WHERE 
        p_showAll OR 
        (rp.row_num > (p_page - 1) * p_pageSize AND rp.row_num <= p_page * p_pageSize)
    ORDER BY rp.row_num;
END;
$$ LANGUAGE plpgsql;

-- Function to get Shopify inventory count
CREATE OR REPLACE FUNCTION GetShopifyInventoryCount(p_storeConnectionId UUID)
RETURNS TABLE (
    "total_products" INTEGER,
    "in_stock_products" INTEGER,
    "out_of_stock_products" INTEGER,
    "low_stock_products" INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH product_inventory AS (
        SELECT 
            p."Id",
            COALESCE(SUM(v."InventoryQuantity"), 0) as total_inventory
        FROM "ShopifyProducts" p
        LEFT JOIN "ShopifyProductVariants" v ON p."Id" = v."ProductId"
        WHERE p."StoreConnectionId" = p_storeConnectionId
        GROUP BY p."Id"
    )
    SELECT 
        COUNT(*)::INTEGER as total_products,
        COUNT(CASE WHEN pi.total_inventory > 0 THEN 1 END)::INTEGER as in_stock_products,
        COUNT(CASE WHEN pi.total_inventory = 0 THEN 1 END)::INTEGER as out_of_stock_products,
        COUNT(CASE WHEN pi.total_inventory > 0 AND pi.total_inventory <= 10 THEN 1 END)::INTEGER as low_stock_products
    FROM product_inventory pi;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- PRODUCT FUNCTIONS
-- =============================================

-- Function to get Shopify products with window functions
CREATE OR REPLACE FUNCTION GetShopifyProductsWithWindow(
    p_storeConnectionId UUID,
    p_search TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_page INTEGER DEFAULT 1,
    p_pageSize INTEGER DEFAULT 50,
    p_showAll BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    "Id" UUID,
    "total_count" BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH filtered_products AS (
        SELECT 
            p."Id",
            p."Title",
            p."Status",
            p."ShopifyUpdatedAt",
            COUNT(*) OVER() as total_count
        FROM "ShopifyProducts" p
        WHERE p."StoreConnectionId" = p_storeConnectionId
            AND (p_search IS NULL OR p."Title" ILIKE '%' || p_search || '%')
            AND (p_status IS NULL OR LOWER(p."Status") = LOWER(p_status))
    ),
    ranked_products AS (
        SELECT 
            fp."Id",
            fp."total_count",
            ROW_NUMBER() OVER (
                ORDER BY fp."ShopifyUpdatedAt" DESC, fp."Id" DESC
            ) as row_num
        FROM filtered_products fp
    )
    SELECT 
        rp."Id",
        rp."total_count"
    FROM ranked_products rp
    WHERE 
        p_showAll OR 
        (rp.row_num > (p_page - 1) * p_pageSize AND rp.row_num <= p_page * p_pageSize)
    ORDER BY rp.row_num;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- LOCATION FUNCTIONS
-- =============================================

-- Function to get Shopify products by location
CREATE OR REPLACE FUNCTION GetShopifyProductsByLocation(
    p_storeConnectionId UUID,
    p_locationId TEXT,
    p_search TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_inventoryFilter TEXT DEFAULT NULL,
    p_page INTEGER DEFAULT 1,
    p_pageSize INTEGER DEFAULT 50,
    p_showAll BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    "Id" UUID,
    "total_count" BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH filtered_products AS (
        SELECT 
            p."Id",
            p."Title",
            p."Status",
            p."ShopifyUpdatedAt",
            COALESCE(SUM(il."Available"), 0) as location_inventory,
            COUNT(*) OVER() as total_count
        FROM "ShopifyProducts" p
        LEFT JOIN "ShopifyProductVariants" v ON p."Id" = v."ProductId"
        LEFT JOIN "ShopifyInventoryLevels" il ON v."Id" = il."VariantId" AND il."LocationId" = p_locationId
        WHERE p."StoreConnectionId" = p_storeConnectionId
            AND (p_search IS NULL OR p."Title" ILIKE '%' || p_search || '%')
            AND (p_status IS NULL OR LOWER(p."Status") = LOWER(p_status))
        GROUP BY p."Id", p."Title", p."Status", p."ShopifyUpdatedAt"
    ),
    ranked_products AS (
        SELECT 
            fp."Id",
            fp."total_count",
            ROW_NUMBER() OVER (
                ORDER BY fp."ShopifyUpdatedAt" DESC, fp."Id" DESC
            ) as row_num
        FROM filtered_products fp
        WHERE 
            (p_inventoryFilter IS NULL) OR
            (p_inventoryFilter = 'in-stock' AND fp.location_inventory > 0) OR
            (p_inventoryFilter = 'out-of-stock' AND fp.location_inventory = 0) OR
            (p_inventoryFilter = 'low-stock' AND fp.location_inventory > 0 AND fp.location_inventory <= 10)
    )
    SELECT 
        rp."Id",
        rp."total_count"
    FROM ranked_products rp
    WHERE 
        p_showAll OR 
        (rp.row_num > (p_page - 1) * p_pageSize AND rp.row_num <= p_page * p_pageSize)
    ORDER BY rp.row_num;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FINANCE FUNCTIONS
-- =============================================

-- Function to get finance dashboard summary (from FinanceDashboardStoredProcedures.sql)
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
            ), 0) as cost_of_goods
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
-- EXPENSE MANAGEMENT FUNCTIONS
-- =============================================

-- Paginated and filtered expenses list
CREATE OR REPLACE FUNCTION GetExpensesPaginated(
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL,
    p_type VARCHAR(50) DEFAULT NULL,
    p_category VARCHAR(100) DEFAULT NULL,
    p_status VARCHAR(50) DEFAULT NULL,
    p_min_amount DECIMAL(20,2) DEFAULT NULL,
    p_max_amount DECIMAL(20,2) DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_page INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    "Id" TEXT,
    "Type" VARCHAR(50),
    "Category" VARCHAR(100),
    "Description" TEXT,
    "Amount" DECIMAL(20,2),
    "Currency" VARCHAR(10),
    "Date" TIMESTAMPTZ,
    "PaymentMode" VARCHAR(100),
    "PaidTo" VARCHAR(255),
    "ChartOfAccountCode" VARCHAR(50),
    "ChartOfAccountName" VARCHAR(255),
    "Tags" JSONB,
    "ReceiptUrl" TEXT,
    "CreatedBy" VARCHAR(255),
    "Status" VARCHAR(50),
    "Notes" TEXT,
    "CreatedAt" TIMESTAMPTZ,
    "UpdatedAt" TIMESTAMPTZ,
    total_count BIGINT
)
AS $$
BEGIN
    RETURN QUERY
    WITH filtered AS (
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
            COALESCE(e."Tags", '[]')::jsonb AS "Tags",
            e."ReceiptUrl",
            e."CreatedBy",
            e."Status",
            e."Notes",
            e."CreatedAt",
            e."UpdatedAt",
            COUNT(*) OVER() AS total_count,
            ROW_NUMBER() OVER (ORDER BY e."Date" DESC, e."CreatedAt" DESC) AS row_num
        FROM "Expenses" e
        WHERE (p_start_date IS NULL OR e."Date" >= p_start_date)
          AND (p_end_date IS NULL OR e."Date" <= p_end_date)
          AND (p_type IS NULL OR e."Type" = p_type)
          AND (p_category IS NULL OR e."Category" = p_category)
          AND (p_status IS NULL OR e."Status" = p_status)
          AND (p_min_amount IS NULL OR e."Amount" >= p_min_amount)
          AND (p_max_amount IS NULL OR e."Amount" <= p_max_amount)
          AND (
                p_search IS NULL OR 
                e."Description" ILIKE '%' || p_search || '%' OR 
                e."Category" ILIKE '%' || p_search || '%' OR 
                e."Type" ILIKE '%' || p_search || '%'
          )
    )
    SELECT 
        f."Id",
        f."Type",
        f."Category",
        f."Description",
        f."Amount",
        f."Currency",
        f."Date",
        f."PaymentMode",
        f."PaidTo",
        f."ChartOfAccountCode",
        f."ChartOfAccountName",
        f."Tags",
        f."ReceiptUrl",
        f."CreatedBy",
        f."Status",
        f."Notes",
        f."CreatedAt",
        f."UpdatedAt",
        f.total_count
    FROM filtered f
    WHERE (p_page <= 0 OR p_limit <= 0) -- safety: if invalid, return all
       OR (f.row_num > (p_page - 1) * p_limit AND f.row_num <= p_page * p_limit)
    ORDER BY f.row_num;
END;
$$ LANGUAGE plpgsql;

-- Get single expense by id
CREATE OR REPLACE FUNCTION GetExpenseById(
    p_id TEXT
)
RETURNS TABLE (
    "Id" TEXT,
    "Type" VARCHAR(50),
    "Category" VARCHAR(100),
    "Description" TEXT,
    "Amount" DECIMAL(20,2),
    "Currency" VARCHAR(10),
    "Date" TIMESTAMPTZ,
    "PaymentMode" VARCHAR(100),
    "PaidTo" VARCHAR(255),
    "ChartOfAccountCode" VARCHAR(50),
    "ChartOfAccountName" VARCHAR(255),
    "Tags" JSONB,
    "ReceiptUrl" TEXT,
    "CreatedBy" VARCHAR(255),
    "Status" VARCHAR(50),
    "Notes" TEXT,
    "CreatedAt" TIMESTAMPTZ,
    "UpdatedAt" TIMESTAMPTZ
)
AS $$
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
    WHERE e."Id" = p_id
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Create a new expense and return the inserted row
CREATE OR REPLACE FUNCTION CreateExpense(
    p_type VARCHAR(50),
    p_category VARCHAR(100),
    p_description TEXT,
    p_amount DECIMAL(20,2),
    p_currency VARCHAR(10),
    p_date TIMESTAMPTZ,
    p_payment_mode VARCHAR(100),
    p_paid_to VARCHAR(255),
    p_created_by VARCHAR(255),
    p_chart_of_account_code VARCHAR(50) DEFAULT NULL,
    p_chart_of_account_name VARCHAR(255) DEFAULT NULL,
    p_tags JSONB DEFAULT NULL,
    p_receipt_url TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
    "Id" TEXT,
    "Type" VARCHAR(50),
    "Category" VARCHAR(100),
    "Description" TEXT,
    "Amount" DECIMAL(20,2),
    "Currency" VARCHAR(10),
    "Date" TIMESTAMPTZ,
    "PaymentMode" VARCHAR(100),
    "PaidTo" VARCHAR(255),
    "ChartOfAccountCode" VARCHAR(50),
    "ChartOfAccountName" VARCHAR(255),
    "Tags" JSONB,
    "ReceiptUrl" TEXT,
    "CreatedBy" VARCHAR(255),
    "Status" VARCHAR(50),
    "Notes" TEXT,
    "CreatedAt" TIMESTAMPTZ,
    "UpdatedAt" TIMESTAMPTZ
)
AS $$
DECLARE
    v_id TEXT := gen_random_uuid()::text;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    INSERT INTO "Expenses" (
        "Id", "Type", "Category", "Description", "Amount", "Currency", "Date",
        "PaymentMode", "PaidTo", "ChartOfAccountCode", "ChartOfAccountName", "Tags",
        "ReceiptUrl", "CreatedBy", "Status", "Notes", "CreatedAt", "UpdatedAt"
    ) VALUES (
        COALESCE(v_id, gen_random_uuid()::text), p_type, p_category, p_description, p_amount, p_currency, p_date,
        p_payment_mode, p_paid_to, p_chart_of_account_code, p_chart_of_account_name, p_tags,
        p_receipt_url, p_created_by, 'pending', p_notes, v_now, v_now
    );

    RETURN QUERY SELECT 
        e."Id", e."Type", e."Category", e."Description", e."Amount", e."Currency", e."Date",
        e."PaymentMode", e."PaidTo", e."ChartOfAccountCode", e."ChartOfAccountName", e."Tags",
        e."ReceiptUrl", e."CreatedBy", e."Status", e."Notes", e."CreatedAt", e."UpdatedAt"
    FROM "Expenses" e
    WHERE e."Id" = v_id
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Update an expense and return the updated row
CREATE OR REPLACE FUNCTION UpdateExpense(
    p_id TEXT,
    p_type VARCHAR(50) DEFAULT NULL,
    p_category VARCHAR(100) DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_amount DECIMAL(20,2) DEFAULT NULL,
    p_currency VARCHAR(10) DEFAULT NULL,
    p_date TIMESTAMPTZ DEFAULT NULL,
    p_payment_mode VARCHAR(100) DEFAULT NULL,
    p_paid_to VARCHAR(255) DEFAULT NULL,
    p_chart_of_account_code VARCHAR(50) DEFAULT NULL,
    p_chart_of_account_name VARCHAR(255) DEFAULT NULL,
    p_tags JSONB DEFAULT NULL,
    p_receipt_url TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_status VARCHAR(50) DEFAULT NULL
)
RETURNS TABLE (
    "Id" TEXT,
    "Type" VARCHAR(50),
    "Category" VARCHAR(100),
    "Description" TEXT,
    "Amount" DECIMAL(20,2),
    "Currency" VARCHAR(10),
    "Date" TIMESTAMPTZ,
    "PaymentMode" VARCHAR(100),
    "PaidTo" VARCHAR(255),
    "ChartOfAccountCode" VARCHAR(50),
    "ChartOfAccountName" VARCHAR(255),
    "Tags" JSONB,
    "ReceiptUrl" TEXT,
    "CreatedBy" VARCHAR(255),
    "Status" VARCHAR(50),
    "Notes" TEXT,
    "CreatedAt" TIMESTAMPTZ,
    "UpdatedAt" TIMESTAMPTZ
)
AS $$
BEGIN
    UPDATE "Expenses" e SET
        "Type" = COALESCE(p_type, e."Type"),
        "Category" = COALESCE(p_category, e."Category"),
        "Description" = COALESCE(p_description, e."Description"),
        "Amount" = COALESCE(p_amount, e."Amount"),
        "Currency" = COALESCE(p_currency, e."Currency"),
        "Date" = COALESCE(p_date, e."Date"),
        "PaymentMode" = COALESCE(p_payment_mode, e."PaymentMode"),
        "PaidTo" = COALESCE(p_paid_to, e."PaidTo"),
        "ChartOfAccountCode" = COALESCE(p_chart_of_account_code, e."ChartOfAccountCode"),
        "ChartOfAccountName" = COALESCE(p_chart_of_account_name, e."ChartOfAccountName"),
        "Tags" = COALESCE(p_tags, e."Tags"),
        "ReceiptUrl" = COALESCE(p_receipt_url, e."ReceiptUrl"),
        "Notes" = COALESCE(p_notes, e."Notes"),
        "Status" = COALESCE(p_status, e."Status"),
        "UpdatedAt" = NOW()
    WHERE e."Id" = p_id;

    RETURN QUERY SELECT 
        e."Id", e."Type", e."Category", e."Description", e."Amount", e."Currency", e."Date",
        e."PaymentMode", e."PaidTo", e."ChartOfAccountCode", e."ChartOfAccountName", e."Tags",
        e."ReceiptUrl", e."CreatedBy", e."Status", e."Notes", e."CreatedAt", e."UpdatedAt"
    FROM "Expenses" e
    WHERE e."Id" = p_id
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Delete an expense and return success flag
CREATE OR REPLACE FUNCTION DeleteExpense(
    p_id TEXT
)
RETURNS TABLE (
    result BOOLEAN
)
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM "Expenses" e WHERE e."Id" = p_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN QUERY SELECT (v_deleted > 0) AS result;
END;
$$ LANGUAGE plpgsql;

-- Grants for expense functions
GRANT EXECUTE ON FUNCTION GetExpensesPaginated(TIMESTAMPTZ, TIMESTAMPTZ, VARCHAR, VARCHAR, VARCHAR, DECIMAL, DECIMAL, TEXT, INTEGER, INTEGER) TO PUBLIC;
GRANT EXECUTE ON FUNCTION GetExpenseById(TEXT) TO PUBLIC;
GRANT EXECUTE ON FUNCTION CreateExpense(VARCHAR, VARCHAR, TEXT, DECIMAL, VARCHAR, TIMESTAMPTZ, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, JSONB, TEXT, TEXT) TO PUBLIC;
GRANT EXECUTE ON FUNCTION UpdateExpense(TEXT, VARCHAR, VARCHAR, TEXT, DECIMAL, VARCHAR, TIMESTAMPTZ, VARCHAR, VARCHAR, VARCHAR, VARCHAR, JSONB, TEXT, TEXT, VARCHAR) TO PUBLIC;
GRANT EXECUTE ON FUNCTION DeleteExpense(TEXT) TO PUBLIC;

-- Function to get simple sales analytics
CREATE OR REPLACE FUNCTION GetSimpleSalesAnalytics(
    p_startDate DATE DEFAULT NULL,
    p_endDate DATE DEFAULT NULL,
    p_currency TEXT DEFAULT 'INR'
)
RETURNS TABLE (
    "total_revenue" DECIMAL,
    "total_orders" INTEGER,
    "average_order_value" DECIMAL,
    "total_cost_of_goods" DECIMAL,
    "total_profit" DECIMAL,
    "gross_margin" DECIMAL
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
            0::DECIMAL as cost_of_goods -- Simplified: no cost calculation for now
        FROM "ShopifyOrders" so
        WHERE so."FulfillmentStatus" ILIKE 'fulfilled'
            AND so."DisplayFinancialStatus" NOT IN ('cancelled', 'voided', 'refunded')
                                        AND (p_startDate IS NULL OR so."CreatedAt" >= p_startDate)
                            AND (p_endDate IS NULL OR so."CreatedAt" <= p_endDate)
            AND (p_currency IS NULL OR so."Currency" = p_currency)
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
        END as gross_margin
    FROM shopify_analytics sa;
END;
$$ LANGUAGE plpgsql;

-- Function to get top selling products
CREATE OR REPLACE FUNCTION GetTopSellingProducts(
    p_startDate TIMESTAMP DEFAULT NULL,
    p_endDate TIMESTAMP DEFAULT NULL,
    p_currency TEXT DEFAULT 'INR',
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    "product_id" TEXT,
    "product_title" TEXT,
    "total_quantity" INTEGER,
    "total_revenue" DECIMAL,
    "average_price" DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p."ShopifyProductId" as product_id,
        p."Title" as product_title,
        COALESCE(SUM(li."Quantity"), 0)::INTEGER as total_quantity,
        COALESCE(SUM(li."Quantity" * li."Price"), 0) as total_revenue,
        COALESCE(AVG(li."Price"), 0) as average_price
    FROM "ShopifyProducts" p
    LEFT JOIN "ShopifyOrderLineItems" li ON p."Id" = li."ProductId"
    LEFT JOIN "ShopifyOrders" o ON li."OrderId" = o."Id"
    WHERE (p_startDate IS NULL OR o."ShopifyCreatedAt" >= p_startDate)
        AND (p_endDate IS NULL OR o."ShopifyCreatedAt" <= p_endDate)
    GROUP BY p."Id", p."ShopifyProductId", p."Title"
    HAVING COALESCE(SUM(li."Quantity"), 0) > 0
    ORDER BY total_quantity DESC, total_revenue DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- PRODUCT OPTIMIZATION FUNCTIONS
-- =============================================

-- Function to get products with advanced filtering (from ProductOptimizationStoredProcedures.sql)
CREATE OR REPLACE FUNCTION GetProductsWithAdvancedFiltering(
    p_store_connection_id UUID,
    p_search VARCHAR(255) DEFAULT NULL,
    p_status VARCHAR(50) DEFAULT NULL,
    p_vendor VARCHAR(255) DEFAULT NULL,
    p_product_type VARCHAR(255) DEFAULT NULL,
    p_inventory_filter VARCHAR(50) DEFAULT NULL,
    p_page INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 50,
    p_show_all BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    id UUID,
    shopify_product_id VARCHAR(255),
    title VARCHAR(500),
    handle VARCHAR(255),
    body_html TEXT,
    vendor VARCHAR(255),
    product_type VARCHAR(255),
    status VARCHAR(50),
    tags TEXT,
    image_url TEXT,
    image_alt_text VARCHAR(500),
    image_width INTEGER,
    image_height INTEGER,
    shopify_created_at TIMESTAMP WITH TIME ZONE,
    shopify_updated_at TIMESTAMP WITH TIME ZONE,
    shopify_published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    store_connection_id UUID,
    total_count BIGINT,
    row_num BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH filtered_products AS (
        SELECT 
            sp."Id",
            sp."ShopifyProductId",
            sp."Title",
            sp."Handle",
            sp."BodyHtml",
            sp."Vendor",
            sp."ProductType",
            sp."Status",
            sp."Tags",
            sp."ImageUrl",
            sp."ImageAltText",
            sp."ImageWidth",
            sp."ImageHeight",
            sp."ShopifyCreatedAt",
            sp."ShopifyUpdatedAt",
            sp."ShopifyPublishedAt",
            sp."CreatedAt",
            sp."UpdatedAt",
            sp."StoreConnectionId",
            ROW_NUMBER() OVER (ORDER BY sp."ShopifyUpdatedAt" DESC, sp."Id" DESC) as row_num,
            COUNT(*) OVER() as total_count
        FROM "ShopifyProducts" sp
        WHERE sp."StoreConnectionId" = p_store_connection_id
        AND (p_search IS NULL OR (
            LOWER(sp."Title") LIKE '%' || LOWER(p_search) || '%' OR 
            LOWER(sp."Vendor") LIKE '%' || LOWER(p_search) || '%' OR 
            LOWER(sp."ProductType") LIKE '%' || LOWER(p_search) || '%' OR
            EXISTS (
                SELECT 1 FROM "ShopifyProductVariants" spv 
                WHERE spv."ProductId" = sp."Id" 
                AND (LOWER(spv."Sku") LIKE '%' || LOWER(p_search) || '%' OR 
                     LOWER(spv."Barcode") LIKE '%' || LOWER(p_search) || '%')
            )
        ))
        AND (p_status IS NULL OR LOWER(sp."Status") = LOWER(p_status))
        AND (p_vendor IS NULL OR LOWER(sp."Vendor") = LOWER(p_vendor))
        AND (p_product_type IS NULL OR LOWER(sp."ProductType") = LOWER(p_product_type))
        AND (p_inventory_filter IS NULL OR 
            CASE p_inventory_filter
                WHEN 'in_stock' THEN EXISTS (
                    SELECT 1 FROM "ShopifyProductVariants" spv 
                    WHERE spv."ProductId" = sp."Id" AND spv."InventoryQuantity" > 0
                )
                WHEN 'out_of_stock' THEN NOT EXISTS (
                    SELECT 1 FROM "ShopifyProductVariants" spv 
                    WHERE spv."ProductId" = sp."Id" AND spv."InventoryQuantity" > 0
                )
                WHEN 'low_stock' THEN EXISTS (
                    SELECT 1 FROM "ShopifyProductVariants" spv 
                    WHERE spv."ProductId" = sp."Id" 
                    AND spv."InventoryQuantity" > 0 
                    AND spv."InventoryQuantity" <= 10
                )
                ELSE TRUE
            END
        )
    )
    SELECT 
        fp.id,
        fp.shopify_product_id,
        fp.title,
        fp.handle,
        fp.body_html,
        fp.vendor,
        fp.product_type,
        fp.status,
        fp.tags,
        fp.image_url,
        fp.image_alt_text,
        fp.image_width,
        fp.image_height,
        fp.shopify_created_at,
        fp.shopify_updated_at,
        fp.shopify_published_at,
        fp.created_at,
        fp.updated_at,
        fp.store_connection_id,
        fp.total_count,
        fp.row_num
    FROM filtered_products fp
    WHERE p_show_all OR (fp.row_num > (p_page - 1) * p_page_size AND fp.row_num <= p_page * p_page_size)
    ORDER BY fp.row_num;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Grant execute permissions for all functions
GRANT EXECUTE ON FUNCTION GetShopifyProductsWithInventory(UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER, BOOLEAN) TO PUBLIC;
GRANT EXECUTE ON FUNCTION GetShopifyInventoryCount(UUID) TO PUBLIC;
GRANT EXECUTE ON FUNCTION GetShopifyProductsWithWindow(UUID, TEXT, TEXT, INTEGER, INTEGER, BOOLEAN) TO PUBLIC;
GRANT EXECUTE ON FUNCTION GetShopifyProductsByLocation(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, BOOLEAN) TO PUBLIC;
GRANT EXECUTE ON FUNCTION GetFinanceDashboardSummary(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, VARCHAR) TO PUBLIC;
GRANT EXECUTE ON FUNCTION GetSimpleSalesAnalytics(DATE, DATE, TEXT) TO PUBLIC;
GRANT EXECUTE ON FUNCTION GetTopSellingProducts(TIMESTAMP, TIMESTAMP, TEXT, INTEGER) TO PUBLIC;
GRANT EXECUTE ON FUNCTION GetProductsWithAdvancedFiltering(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, INTEGER, INTEGER, BOOLEAN) TO PUBLIC; 

-- =============================================
-- WAREHOUSE SHIPMENT FUNCTIONS
-- =============================================

-- Function to get a warehouse shipment header by id
CREATE OR REPLACE FUNCTION GetWarehouseShipmentHeader(
    p_shipment_id INTEGER
)
RETURNS TABLE (
    "Id" INTEGER,
    "ShipmentNumber" VARCHAR(100),
    "Status" VARCHAR(50),
    "Notes" VARCHAR(500),
    "CreatedAt" TIMESTAMPTZ,
    "DispatchedAt" TIMESTAMPTZ,
    "ReceivedAt" TIMESTAMPTZ,
    "UpdatedAt" TIMESTAMPTZ,
    "CreatedBy" VARCHAR(100),
    "DispatchedBy" VARCHAR(100),
    "ReceivedBy" VARCHAR(100)
)
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ws."Id",
        ws."ShipmentNumber",
        ws."Status",
        ws."Notes",
        ws."CreatedAt",
        ws."DispatchedAt",
        ws."ReceivedAt",
        ws."UpdatedAt",
        ws."CreatedBy",
        ws."DispatchedBy",
        ws."ReceivedBy"
    FROM "WarehouseShipments" ws
    WHERE ws."Id" = p_shipment_id
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get warehouse shipment items by shipment id
CREATE OR REPLACE FUNCTION GetWarehouseShipmentItems(
    p_shipment_id INTEGER
)
RETURNS TABLE (
    "Id" INTEGER,
    "ShipmentId" INTEGER,
    "ProductBarcode" VARCHAR(255),
    "ShopifyProductId" VARCHAR(255),
    "ShopifyVariantId" VARCHAR(255),
    "ProductTitle" VARCHAR(500),
    "VariantTitle" VARCHAR(500),
    "Sku" VARCHAR(100),
    "QuantityPlanned" INTEGER,
    "QuantityDispatched" INTEGER,
    "QuantityReceived" INTEGER,
    "UnitPrice" DECIMAL(18,2),
    "CompareAtPrice" DECIMAL(18,2),
    "Currency" VARCHAR(10),
    "ProductImageUrl" VARCHAR(1000),
    "Notes" VARCHAR(500),
    "CreatedAt" TIMESTAMPTZ,
    "UpdatedAt" TIMESTAMPTZ
)
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wsi."Id",
        wsi."ShipmentId",
        wsi."ProductBarcode",
        wsi."ShopifyProductId",
        wsi."ShopifyVariantId",
        wsi."ProductTitle",
        wsi."VariantTitle",
        wsi."Sku",
        wsi."QuantityPlanned",
        wsi."QuantityDispatched",
        wsi."QuantityReceived",
        wsi."UnitPrice",
        wsi."CompareAtPrice",
        wsi."Currency",
        wsi."ProductImageUrl",
        wsi."Notes",
        wsi."CreatedAt",
        wsi."UpdatedAt"
    FROM "WarehouseShipmentItems" wsi
    WHERE wsi."ShipmentId" = p_shipment_id
    ORDER BY wsi."CreatedAt" ASC;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for shipment functions
GRANT EXECUTE ON FUNCTION GetWarehouseShipmentHeader(INTEGER) TO PUBLIC;
GRANT EXECUTE ON FUNCTION GetWarehouseShipmentItems(INTEGER) TO PUBLIC;