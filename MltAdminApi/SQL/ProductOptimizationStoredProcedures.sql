-- Product Optimization Stored Procedures
-- These procedures replace complex C# queries for better performance

-- =============================================
-- Get Products with Advanced Filtering and Pagination
-- =============================================
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
        fp."Id",
        fp."ShopifyProductId",
        fp."Title",
        fp."Handle",
        fp."BodyHtml",
        fp."Vendor",
        fp."ProductType",
        fp."Status",
        fp."Tags",
        fp."ImageUrl",
        fp."ImageAltText",
        fp."ImageWidth",
        fp."ImageHeight",
        fp."ShopifyCreatedAt",
        fp."ShopifyUpdatedAt",
        fp."ShopifyPublishedAt",
        fp."CreatedAt",
        fp."UpdatedAt",
        fp."StoreConnectionId",
        fp."total_count",
        fp."row_num"
    FROM filtered_products fp
    WHERE p_show_all OR (fp."row_num" > (p_page - 1) * p_page_size AND fp."row_num" <= p_page * p_page_size)
    ORDER BY fp."ShopifyUpdatedAt" DESC, fp."Id" DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Get Product Counts by Status and Inventory
-- =============================================
CREATE OR REPLACE FUNCTION GetProductCounts(
    p_store_connection_id UUID
)
RETURNS TABLE (
    total_count BIGINT,
    active_count BIGINT,
    draft_count BIGINT,
    archived_count BIGINT,
    out_of_stock_count BIGINT,
    limited_stock_count BIGINT,
    in_stock_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH product_counts AS (
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN LOWER(sp."Status") = 'active' THEN 1 END) as active,
            COUNT(CASE WHEN LOWER(sp."Status") = 'draft' THEN 1 END) as draft,
            COUNT(CASE WHEN LOWER(sp."Status") = 'archived' THEN 1 END) as archived
        FROM "ShopifyProducts" sp
        WHERE sp."StoreConnectionId" = p_store_connection_id
    ),
    inventory_counts AS (
        SELECT 
            COUNT(DISTINCT sp."Id") as out_of_stock,
            COUNT(DISTINCT CASE 
                WHEN total_inventory > 0 AND total_inventory <= 10 
                THEN sp."Id" 
            END) as limited_stock,
            COUNT(DISTINCT CASE 
                WHEN total_inventory > 0 
                THEN sp."Id" 
            END) as in_stock
        FROM "ShopifyProducts" sp
        LEFT JOIN (
            SELECT 
                spv."ProductId",
                SUM(spv."InventoryQuantity") as total_inventory
            FROM "ShopifyProductVariants" spv
            GROUP BY spv."ProductId"
        ) inventory ON inventory."ProductId" = sp."Id"
        WHERE sp."StoreConnectionId" = p_store_connection_id
    )
    SELECT 
        pc.total,
        pc.active,
        pc.draft,
        pc.archived,
        ic.out_of_stock,
        ic.limited_stock,
        ic.in_stock
    FROM product_counts pc
    CROSS JOIN inventory_counts ic;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Get Products with Inventory Levels by Location
-- =============================================
CREATE OR REPLACE FUNCTION GetProductsByLocation(
    p_store_connection_id UUID,
    p_location_id VARCHAR(255),
    p_search VARCHAR(255) DEFAULT NULL,
    p_status VARCHAR(50) DEFAULT NULL,
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
        AND EXISTS (
            SELECT 1 FROM "ShopifyProductVariants" spv
            JOIN "ShopifyInventoryLevels" sil ON sil."VariantId" = spv."Id"
            WHERE spv."ProductId" = sp."Id" 
            AND sil."LocationId" = p_location_id
        )
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
        AND (p_inventory_filter IS NULL OR 
            CASE p_inventory_filter
                WHEN 'in_stock' THEN EXISTS (
                    SELECT 1 FROM "ShopifyProductVariants" spv
                    JOIN "ShopifyInventoryLevels" sil ON sil."VariantId" = spv."Id"
                    WHERE spv."ProductId" = sp."Id" 
                    AND sil."LocationId" = p_location_id
                    AND sil."Available" > 0
                )
                WHEN 'out_of_stock' THEN NOT EXISTS (
                    SELECT 1 FROM "ShopifyProductVariants" spv
                    JOIN "ShopifyInventoryLevels" sil ON sil."VariantId" = spv."Id"
                    WHERE spv."ProductId" = sp."Id" 
                    AND sil."LocationId" = p_location_id
                    AND sil."Available" > 0
                )
                WHEN 'low_stock' THEN EXISTS (
                    SELECT 1 FROM "ShopifyProductVariants" spv
                    JOIN "ShopifyInventoryLevels" sil ON sil."VariantId" = spv."Id"
                    WHERE spv."ProductId" = sp."Id" 
                    AND sil."LocationId" = p_location_id
                    AND sil."Available" > 0 
                    AND sil."Available" <= 10
                )
                ELSE TRUE
            END
        )
    )
    SELECT 
        fp."Id",
        fp."ShopifyProductId",
        fp."Title",
        fp."Handle",
        fp."BodyHtml",
        fp."Vendor",
        fp."ProductType",
        fp."Status",
        fp."Tags",
        fp."ImageUrl",
        fp."ImageAltText",
        fp."ImageWidth",
        fp."ImageHeight",
        fp."ShopifyCreatedAt",
        fp."ShopifyUpdatedAt",
        fp."ShopifyPublishedAt",
        fp."CreatedAt",
        fp."UpdatedAt",
        fp."StoreConnectionId",
        fp."total_count",
        fp."row_num"
    FROM filtered_products fp
    WHERE p_show_all OR (fp."row_num" > (p_page - 1) * p_page_size AND fp."row_num" <= p_page * p_page_size)
    ORDER BY fp."ShopifyUpdatedAt" DESC, fp."Id" DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Get Product Variants with Inventory
-- =============================================
CREATE OR REPLACE FUNCTION GetProductVariantsWithInventory(
    p_product_id UUID
)
RETURNS TABLE (
    id UUID,
    shopify_variant_id VARCHAR(255),
    title VARCHAR(255),
    sku VARCHAR(255),
    barcode VARCHAR(255),
    price DECIMAL(18,2),
    compare_at_price DECIMAL(18,2),
    inventory_quantity INTEGER,
    inventory_policy VARCHAR(50),
    weight DECIMAL(18,2),
    weight_unit VARCHAR(10),
    requires_shipping BOOLEAN,
    taxable BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    product_id UUID,
    inventory_levels JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        spv."Id",
        spv."ShopifyVariantId",
        spv."Title",
        spv."Sku",
        spv."Barcode",
        spv."Price",
        spv."CompareAtPrice",
        spv."InventoryQuantity",
        spv."InventoryPolicy",
        spv."Weight",
        spv."WeightUnit",
        spv."RequiresShipping",
        spv."Taxable",
        spv."CreatedAt",
        spv."UpdatedAt",
        spv."ProductId",
        COALESCE(
            (SELECT jsonb_agg(
                jsonb_build_object(
                    'id', sil."Id",
                    'locationId', sil."LocationId",
                    'available', sil."Available",
                    'incoming', sil."Incoming",
                    'outgoing', sil."Outgoing",
                    'createdAt', sil."CreatedAt",
                    'updatedAt', sil."UpdatedAt"
                )
            ) FROM "ShopifyInventoryLevels" sil WHERE sil."VariantId" = spv."Id"),
            '[]'::jsonb
        ) as inventory_levels
    FROM "ShopifyProductVariants" spv
    WHERE spv."ProductId" = p_product_id
    ORDER BY spv."CreatedAt" ASC;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Get Product Analytics Summary
-- =============================================
CREATE OR REPLACE FUNCTION GetProductAnalyticsSummary(
    p_store_connection_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
    total_products BIGINT,
    active_products BIGINT,
    draft_products BIGINT,
    archived_products BIGINT,
    products_with_variants BIGINT,
    products_with_images BIGINT,
    average_variants_per_product DECIMAL(10,2),
    total_inventory_value DECIMAL(18,2),
    low_stock_products BIGINT,
    out_of_stock_products BIGINT,
    recently_updated_products BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH product_stats AS (
        SELECT 
            COUNT(*) as total_products,
            COUNT(CASE WHEN LOWER(sp."Status") = 'active' THEN 1 END) as active_products,
            COUNT(CASE WHEN LOWER(sp."Status") = 'draft' THEN 1 END) as draft_products,
            COUNT(CASE WHEN LOWER(sp."Status") = 'archived' THEN 1 END) as archived_products,
            COUNT(CASE WHEN sp."ImageUrl" IS NOT NULL THEN 1 END) as products_with_images,
            COUNT(CASE WHEN sp."UpdatedAt" >= COALESCE(p_start_date, sp."UpdatedAt") 
                       AND sp."UpdatedAt" <= COALESCE(p_end_date, sp."UpdatedAt") 
                THEN 1 END) as recently_updated_products
        FROM "ShopifyProducts" sp
        WHERE sp."StoreConnectionId" = p_store_connection_id
    ),
    variant_stats AS (
        SELECT 
            COUNT(DISTINCT spv."ProductId") as products_with_variants,
            AVG(variant_count) as average_variants_per_product
        FROM "ShopifyProductVariants" spv
        JOIN (
            SELECT "ProductId", COUNT(*) as variant_count
            FROM "ShopifyProductVariants"
            WHERE "ProductId" IN (SELECT "Id" FROM "ShopifyProducts" WHERE "StoreConnectionId" = p_store_connection_id)
            GROUP BY "ProductId"
        ) vc ON vc."ProductId" = spv."ProductId"
    ),
    inventory_stats AS (
        SELECT 
            COALESCE(SUM(spv."Price" * spv."InventoryQuantity"), 0) as total_inventory_value,
            COUNT(DISTINCT CASE 
                WHEN spv."InventoryQuantity" = 0 
                THEN spv."ProductId" 
            END) as out_of_stock_products,
            COUNT(DISTINCT CASE 
                WHEN spv."InventoryQuantity" > 0 AND spv."InventoryQuantity" <= 10 
                THEN spv."ProductId" 
            END) as low_stock_products
        FROM "ShopifyProductVariants" spv
        JOIN "ShopifyProducts" sp ON sp."Id" = spv."ProductId"
        WHERE sp."StoreConnectionId" = p_store_connection_id
    )
    SELECT 
        ps.total_products,
        ps.active_products,
        ps.draft_products,
        ps.archived_products,
        vs.products_with_variants,
        ps.products_with_images,
        vs.average_variants_per_product,
        is.total_inventory_value,
        is.low_stock_products,
        is.out_of_stock_products,
        ps.recently_updated_products
    FROM product_stats ps
    CROSS JOIN variant_stats vs
    CROSS JOIN inventory_stats is;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Search Products by Multiple Criteria
-- =============================================
CREATE OR REPLACE FUNCTION SearchProductsAdvanced(
    p_store_connection_id UUID,
    p_search_term VARCHAR(255),
    p_search_fields TEXT[] DEFAULT ARRAY['title', 'vendor', 'product_type', 'sku', 'barcode', 'tags'],
    p_status VARCHAR(50) DEFAULT NULL,
    p_page INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    shopify_product_id VARCHAR(255),
    title VARCHAR(500),
    handle VARCHAR(255),
    vendor VARCHAR(255),
    product_type VARCHAR(255),
    status VARCHAR(50),
    tags TEXT,
    image_url TEXT,
    match_score INTEGER,
    total_count BIGINT,
    row_num BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH search_results AS (
        SELECT 
            sp."Id",
            sp."ShopifyProductId",
            sp."Title",
            sp."Handle",
            sp."Vendor",
            sp."ProductType",
            sp."Status",
            sp."Tags",
            sp."ImageUrl",
            CASE 
                WHEN LOWER(sp."Title") LIKE '%' || LOWER(p_search_term) || '%' THEN 100
                WHEN LOWER(sp."Vendor") LIKE '%' || LOWER(p_search_term) || '%' THEN 80
                WHEN LOWER(sp."ProductType") LIKE '%' || LOWER(p_search_term) || '%' THEN 60
                WHEN LOWER(sp."Tags") LIKE '%' || LOWER(p_search_term) || '%' THEN 40
                WHEN EXISTS (
                    SELECT 1 FROM "ShopifyProductVariants" spv 
                    WHERE spv."ProductId" = sp."Id" 
                    AND LOWER(spv."Sku") LIKE '%' || LOWER(p_search_term) || '%'
                ) THEN 90
                WHEN EXISTS (
                    SELECT 1 FROM "ShopifyProductVariants" spv 
                    WHERE spv."ProductId" = sp."Id" 
                    AND LOWER(spv."Barcode") LIKE '%' || LOWER(p_search_term) || '%'
                ) THEN 85
                ELSE 0
            END as match_score,
            ROW_NUMBER() OVER (ORDER BY 
                CASE 
                    WHEN LOWER(sp."Title") LIKE '%' || LOWER(p_search_term) || '%' THEN 100
                    WHEN LOWER(sp."Vendor") LIKE '%' || LOWER(p_search_term) || '%' THEN 80
                    WHEN LOWER(sp."ProductType") LIKE '%' || LOWER(p_search_term) || '%' THEN 60
                    WHEN LOWER(sp."Tags") LIKE '%' || LOWER(p_search_term) || '%' THEN 40
                    WHEN EXISTS (
                        SELECT 1 FROM "ShopifyProductVariants" spv 
                        WHERE spv."ProductId" = sp."Id" 
                        AND LOWER(spv."Sku") LIKE '%' || LOWER(p_search_term) || '%'
                    ) THEN 90
                    WHEN EXISTS (
                        SELECT 1 FROM "ShopifyProductVariants" spv 
                        WHERE spv."ProductId" = sp."Id" 
                        AND LOWER(spv."Barcode") LIKE '%' || LOWER(p_search_term) || '%'
                    ) THEN 85
                    ELSE 0
                END DESC,
                sp."ShopifyUpdatedAt" DESC
            ) as row_num,
            COUNT(*) OVER() as total_count
        FROM "ShopifyProducts" sp
        WHERE sp."StoreConnectionId" = p_store_connection_id
        AND (
            LOWER(sp."Title") LIKE '%' || LOWER(p_search_term) || '%' OR 
            LOWER(sp."Vendor") LIKE '%' || LOWER(p_search_term) || '%' OR 
            LOWER(sp."ProductType") LIKE '%' || LOWER(p_search_term) || '%' OR
            LOWER(sp."Tags") LIKE '%' || LOWER(p_search_term) || '%' OR
            EXISTS (
                SELECT 1 FROM "ShopifyProductVariants" spv 
                WHERE spv."ProductId" = sp."Id" 
                AND (LOWER(spv."Sku") LIKE '%' || LOWER(p_search_term) || '%' OR 
                     LOWER(spv."Barcode") LIKE '%' || LOWER(p_search_term) || '%')
            )
        )
        AND (p_status IS NULL OR LOWER(sp."Status") = LOWER(p_status))
    )
    SELECT 
        sr."Id",
        sr."ShopifyProductId",
        sr."Title",
        sr."Handle",
        sr."Vendor",
        sr."ProductType",
        sr."Status",
        sr."Tags",
        sr."ImageUrl",
        sr."match_score",
        sr."total_count",
        sr."row_num"
    FROM search_results sr
    WHERE sr."row_num" > (p_page - 1) * p_page_size 
    AND sr."row_num" <= p_page * p_page_size
    ORDER BY sr."match_score" DESC, sr."ShopifyUpdatedAt" DESC;
END;
$$ LANGUAGE plpgsql; 