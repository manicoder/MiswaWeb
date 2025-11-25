using Mlt.Admin.Api.Constants;

namespace Mlt.Admin.Api.GraphQL
{
    public static class ShopifyQueries
    {
        public static string GetProductsQuery(int limit = ShopifyConstants.DefaultProductLimit, string? cursor = null, string? searchQuery = null)
        {
            var afterClause = !string.IsNullOrEmpty(cursor) ? $", after: \"{cursor}\"" : "";
            var queryClause = !string.IsNullOrEmpty(searchQuery) ? $", query: \"{searchQuery}\"" : "";
            
            return $@"
                query {{
                    products(first: {limit}{afterClause}{queryClause}, sortKey: CREATED_AT, reverse: true) {{
                        edges {{
                            cursor
                            node {{
                                id
                                title
                                handle
                                bodyHtml
                                vendor
                                productType
                                createdAt
                                updatedAt
                                publishedAt
                                status
                                tags
                                variants(first: {ShopifyConstants.MaxVariantsPerProduct}) {{
                                    edges {{
                                        node {{
                                            id
                                            title
                                            price
                                            compareAtPrice
                                            sku
                                            barcode
                                            inventoryQuantity
                                            createdAt
                                            updatedAt
                                            inventoryItem {{
                                                id
                                                inventoryLevels(first: 10) {{
                                                    edges {{
                                                        node {{
                                                            id
                                                            quantities(names: [""available""]) {{
                                                                quantity
                                                                name
                                                            }}
                                                            location {{
                                                                id
                                                                name
                                                            }}
                                                            createdAt
                                                            updatedAt
                                                        }}
                                                    }}
                                                }}
                                            }}
                                        }}
                                    }}
                                }}
                                images(first: {ShopifyConstants.MaxImagesPerProduct}) {{
                                    edges {{
                                        node {{
                                            id
                                            url
                                            altText
                                            width
                                            height
                                        }}
                                    }}
                                }}
                            }}
                        }}
                        pageInfo {{
                            hasNextPage
                            hasPreviousPage
                            startCursor
                            endCursor
                        }}
                    }}
                }}";
        }

        public static string SearchProductsQuery(string searchTerm, int limit = ShopifyConstants.DefaultProductLimit, string? cursor = null)
        {
            var afterClause = !string.IsNullOrEmpty(cursor) ? $", after: \"{cursor}\"" : "";
            
            return $@"
                query {{
                    products(first: {limit}{afterClause}, query: ""{searchTerm}"", sortKey: CREATED_AT, reverse: true) {{
                        edges {{
                            cursor
                            node {{
                                id
                                title
                                handle
                                bodyHtml
                                vendor
                                productType
                                createdAt
                                updatedAt
                                publishedAt
                                status
                                tags
                                variants(first: {ShopifyConstants.MaxVariantsPerProduct}) {{
                                    edges {{
                                        node {{
                                            id
                                            title
                                            price
                                            compareAtPrice
                                            sku
                                            barcode
                                            inventoryQuantity
                                        }}
                                    }}
                                }}
                                images(first: {ShopifyConstants.MaxImagesPerProduct}) {{
                                    edges {{
                                        node {{
                                            id
                                            url
                                            altText
                                            width
                                            height
                                        }}
                                    }}
                                }}
                            }}
                        }}
                        pageInfo {{
                            hasNextPage
                            hasPreviousPage
                            startCursor
                            endCursor
                        }}
                    }}
                }}";
        }

        public static string GetSingleProductQuery(string productId)
        {
            return $@"
                query {{
                    product(id: ""{productId}"") {{
                        id
                        title
                        handle
                        bodyHtml
                        vendor
                        productType
                        createdAt
                        updatedAt
                        publishedAt
                        status
                        tags
                        variants(first: {ShopifyConstants.MaxVariantsForSingleProduct}) {{
                            edges {{
                                node {{
                                    id
                                    title
                                    price
                                    compareAtPrice
                                    sku
                                    barcode
                                    inventoryQuantity
                                }}
                            }}
                        }}
                        images(first: {ShopifyConstants.MaxImagesForSingleProduct}) {{
                            edges {{
                                node {{
                                    id
                                    url
                                    altText
                                    width
                                    height
                                }}
                            }}
                        }}
                    }}
                }}";
        }

        public static string GetOrdersQuery(int limit = ShopifyConstants.DefaultOrderLimit, string? cursor = null)
        {
            var afterClause = !string.IsNullOrEmpty(cursor) ? $", after: \"{cursor}\"" : "";
            
            return $@"
                query {{
                    orders(first: {limit}{afterClause}, sortKey: CREATED_AT, reverse: true) {{
                        edges {{
                            node {{
                                id
                                name
                                createdAt
                                displayFulfillmentStatus
                                displayFinancialStatus
                                totalPriceSet {{
                                    shopMoney {{
                                        amount
                                        currencyCode
                                    }}
                                }}
                                customer {{
                                    firstName
                                    lastName
                                    email
                                }}
                                shippingAddress {{
                                    firstName
                                    lastName
                                    address1
                                    city
                                    province
                                    country
                                    zip
                                }}
                                lineItems(first: 50) {{
                                    edges {{
                                        node {{
                                            id
                                            title
                                            quantity
                                            originalTotalSet {{
                                                shopMoney {{
                                                    amount
                                                    currencyCode
                                                }}
                                            }}
                                            image {{
                                                url
                                            }}
                                            variant {{
                                                id
                                                title
                                                sku
                                                price
                                                compareAtPrice
                                            }}
                                        }}
                                    }}
                                }}
                            }}
                        }}
                        pageInfo {{
                            hasNextPage
                            hasPreviousPage
                            startCursor
                            endCursor
                        }}
                    }}
                }}";
        }

        public static string GetOrdersUpdatedSinceQuery(DateTime sinceDate, int limit = 100, string? cursor = null)
        {
            var afterClause = !string.IsNullOrEmpty(cursor) ? $", after: \"{cursor}\"" : "";
            var sinceDateString = sinceDate.ToString("yyyy-MM-ddTHH:mm:ssZ");
            
            return $@"
                query {{
                    orders(first: {limit}{afterClause}, sortKey: UPDATED_AT, reverse: true, query: ""updated_at:>'{sinceDateString}'"") {{
                        edges {{
                            node {{
                                id
                                name
                                createdAt
                                updatedAt
                                displayFulfillmentStatus
                                displayFinancialStatus
                                totalPriceSet {{
                                    shopMoney {{
                                        amount
                                        currencyCode
                                    }}
                                }}
                                customer {{
                                    firstName
                                    lastName
                                    email
                                }}
                                shippingAddress {{
                                    firstName
                                    lastName
                                    address1
                                    city
                                    province
                                    country
                                    zip
                                }}
                                lineItems(first: 50) {{
                                    edges {{
                                        node {{
                                            id
                                            title
                                            quantity
                                            originalTotalSet {{
                                                shopMoney {{
                                                    amount
                                                    currencyCode
                                                }}
                                            }}
                                            image {{
                                                url
                                            }}
                                            variant {{
                                                id
                                                title
                                                sku
                                                price
                                                compareAtPrice
                                            }}
                                        }}
                                    }}
                                }}
                            }}
                        }}
                        pageInfo {{
                            hasNextPage
                            hasPreviousPage
                            startCursor
                            endCursor
                        }}
                    }}
                }}";
        }

        public static string GetOrdersCreatedSinceQuery(DateTime sinceDate, int limit = 100, string? cursor = null)
        {
            var afterClause = !string.IsNullOrEmpty(cursor) ? $", after: \"{cursor}\"" : "";
            var sinceDateString = sinceDate.ToString("yyyy-MM-ddTHH:mm:ssZ");
            
            return $@"
                query {{
                    orders(first: {limit}{afterClause}, sortKey: CREATED_AT, reverse: true, query: ""created_at:>'{sinceDateString}'"") {{
                        edges {{
                            node {{
                                id
                                name
                                createdAt
                                updatedAt
                                displayFulfillmentStatus
                                displayFinancialStatus
                                totalPriceSet {{
                                    shopMoney {{
                                        amount
                                        currencyCode
                                    }}
                                }}
                                customer {{
                                    firstName
                                    lastName
                                    email
                                }}
                                shippingAddress {{
                                    firstName
                                    lastName
                                    address1
                                    city
                                    province
                                    country
                                    zip
                                }}
                                lineItems(first: 50) {{
                                    edges {{
                                        node {{
                                            id
                                            title
                                            quantity
                                            originalTotalSet {{
                                                shopMoney {{
                                                    amount
                                                    currencyCode
                                                }}
                                            }}
                                            image {{
                                                url
                                            }}
                                            variant {{
                                                id
                                                title
                                                sku
                                                price
                                                compareAtPrice
                                            }}
                                        }}
                                    }}
                                }}
                            }}
                        }}
                        pageInfo {{
                            hasNextPage
                            hasPreviousPage
                            startCursor
                            endCursor
                        }}
                    }}
                }}";
        }

        public static string SearchOrdersQuery(string searchTerm, int limit = ShopifyConstants.DefaultOrderLimit, string? cursor = null)
        {
            var afterClause = !string.IsNullOrEmpty(cursor) ? $", after: \"{cursor}\"" : "";
            
            return $@"
                query {{
                    orders(first: {limit}{afterClause}, query: ""{searchTerm}"", sortKey: CREATED_AT, reverse: true) {{
                        edges {{
                            cursor
                            node {{
                                id
                                name
                                email
                                createdAt
                                displayFulfillmentStatus
                                displayFinancialStatus
                                totalPriceSet {{
                                    shopMoney {{
                                        amount
                                        currencyCode
                                    }}
                                }}
                                customer {{
                                    id
                                    firstName
                                    lastName
                                    email
                                }}
                                shippingAddress {{
                                    firstName
                                    lastName
                                    address1
                                    city
                                    province
                                    country
                                    zip
                                }}
                                lineItems(first: 50) {{
                                    edges {{
                                        node {{
                                            id
                                            title
                                            quantity
                                            originalTotalSet {{
                                                shopMoney {{
                                                    amount
                                                    currencyCode
                                                }}
                                            }}
                                            image {{
                                                url
                                                altText
                                            }}
                                        }}
                                    }}
                                }}
                            }}
                        }}
                        pageInfo {{
                            hasNextPage
                            hasPreviousPage
                            startCursor
                            endCursor
                        }}
                    }}
                }}";
        }

        public static string GetShopInfoQuery()
        {
            return @"
                query {
                    shop {
                        id
                        name
                        email
                        domain
                        myshopifyDomain
                        plan {
                            displayName
                        }
                        currencyCode
                        timezoneAbbreviation
                        createdAt
                        updatedAt
                    }
                }";
        }

        public static string GetProductCountQuery()
        {
            return @"
                query {
                    productsCount {
                        count
                    }
                }";
        }

        public static string GetOrderCountQuery()
        {
            return @"
                query {
                    ordersCount {
                        count
                    }
                }";
        }

        public static string GetUnfulfilledOrdersQuery(int limit = 250)
        {
            var sevenDaysAgo = DateTime.UtcNow.AddDays(-7).ToString("yyyy-MM-dd");
            return $@"
                query {{
                    orders(first: {limit}, query: ""fulfillment_status:UNFULFILLED AND created_at:>={sevenDaysAgo}"", sortKey: CREATED_AT, reverse: true) {{
                        edges {{
                            node {{
                                id
                                name
                                createdAt
                                displayFulfillmentStatus
                                displayFinancialStatus
                                totalPriceSet {{
                                    shopMoney {{
                                        amount
                                        currencyCode
                                    }}
                                }}
                                customer {{
                                    firstName
                                    lastName
                                    email
                                }}
                                shippingAddress {{
                                    firstName
                                    lastName
                                    address1
                                    city
                                    province
                                    country
                                    zip
                                }}
                                lineItems(first: 50) {{
                                    edges {{
                                        node {{
                                            id
                                            title
                                            quantity
                                            originalTotalSet {{
                                                shopMoney {{
                                                    amount
                                                    currencyCode
                                                }}
                                            }}
                                            image {{
                                                url
                                                altText
                                            }}
                                        }}
                                    }}
                                }}
                            }}
                        }}
                    }}
                }}";
        }

        public static string GetTodayOrdersQuery(int limit = 250)
        {
            var today = DateTime.UtcNow.Date.ToString("yyyy-MM-dd");
            return $@"
                query {{
                    orders(first: {limit}, query: ""created_at:>={today}"", sortKey: CREATED_AT, reverse: true) {{
                        edges {{
                            node {{
                                id
                                name
                                createdAt
                                displayFulfillmentStatus
                                displayFinancialStatus
                                totalPriceSet {{
                                    shopMoney {{
                                        amount
                                        currencyCode
                                    }}
                                }}
                                customer {{
                                    firstName
                                    lastName
                                    email
                                }}
                                shippingAddress {{
                                    firstName
                                    lastName
                                    address1
                                    city
                                    province
                                    country
                                    zip
                                }}
                                lineItems(first: 50) {{
                                    edges {{
                                        node {{
                                            id
                                            title
                                            quantity
                                            originalTotalSet {{
                                                shopMoney {{
                                                    amount
                                                    currencyCode
                                                }}
                                            }}
                                            image {{
                                                url
                                                altText
                                            }}
                                        }}
                                    }}
                                }}
                            }}
                        }}
                    }}
                }}";
        }

        public static string GetCustomersQuery(int limit = ShopifyConstants.DefaultOrderLimit, string? cursor = null)
        {
            var afterClause = !string.IsNullOrEmpty(cursor) ? $", after: \"{cursor}\"" : "";
            
            return $@"
                query {{
                    customers(first: {limit}{afterClause}, sortKey: CREATED_AT, reverse: true) {{
                        edges {{
                            node {{
                                id
                                firstName
                                lastName
                                email
                                phone
                                createdAt
                                updatedAt
                                acceptsMarketing
                                state
                                ordersCount
                                totalSpent
                                lastOrder {{
                                    id
                                    name
                                    createdAt
                                }}
                                defaultAddress {{
                                    id
                                    firstName
                                    lastName
                                    address1
                                    address2
                                    city
                                    province
                                    country
                                    zip
                                    phone
                                }}
                                addresses(first: 5) {{
                                    edges {{
                                        node {{
                                            id
                                            firstName
                                            lastName
                                            address1
                                            address2
                                            city
                                            province
                                            country
                                            zip
                                            phone
                                        }}
                                    }}
                                }}
                                tags
                            }}
                        }}
                        pageInfo {{
                            hasNextPage
                            endCursor
                        }}
                    }}
                }}";
        }

        public static string SearchCustomersQuery(string searchTerm, int limit = ShopifyConstants.DefaultOrderLimit)
        {
            return $@"
                query {{
                    customers(first: {limit}, query: ""{searchTerm}"", sortKey: CREATED_AT, reverse: true) {{
                        edges {{
                            node {{
                                id
                                firstName
                                lastName
                                email
                                phone
                                createdAt
                                updatedAt
                                acceptsMarketing
                                state
                                ordersCount
                                totalSpent
                                lastOrder {{
                                    id
                                    name
                                    createdAt
                                }}
                                defaultAddress {{
                                    id
                                    firstName
                                    lastName
                                    address1
                                    address2
                                    city
                                    province
                                    country
                                    zip
                                    phone
                                }}
                                tags
                            }}
                        }}
                    }}
                }}";
        }

        public static string GetCustomerCountQuery()
        {
            return @"
                query {
                    customersCount {
                        count
                    }
                }";
        }

        public static string GetFulfilledOrdersWithTrackingQuery(int limit = 250, string? cursor = null, string? dateFilter = null)
        {
            var afterClause = !string.IsNullOrEmpty(cursor) ? $", after: \"{cursor}\"" : "";
            
            // Build date query filter
            var queryFilter = BuildDateFilterQuery(dateFilter);
            var queryClause = !string.IsNullOrEmpty(queryFilter) ? $", query: \"{queryFilter}\"" : "";
            
            return $@"
                query {{
                    orders(first: {limit}{afterClause}{queryClause}, sortKey: CREATED_AT, reverse: true) {{
                        edges {{
                            cursor
                            node {{
                                id
                                name
                                createdAt
                                displayFulfillmentStatus
                                displayFinancialStatus
                                totalPriceSet {{
                                    shopMoney {{
                                        amount
                                        currencyCode
                                    }}
                                }}
                                customer {{
                                    firstName
                                    lastName
                                    email
                                }}
                                shippingAddress {{
                                    name
                                    firstName
                                    lastName
                                    address1
                                    address2
                                    city
                                    province
                                    country
                                    zip
                                    phone
                                }}
                                fulfillments(first: 10) {{
                                    id
                                    status
                                    createdAt
                                    updatedAt
                                    trackingInfo {{
                                        number
                                        url
                                        company
                                    }}
                                    service {{
                                        serviceName
                                        type
                                    }}
                                }}
                                lineItems(first: 50) {{
                                    edges {{
                                        node {{
                                            id
                                            title
                                            quantity
                                            originalTotalSet {{
                                                shopMoney {{
                                                    amount
                                                    currencyCode
                                                }}
                                            }}
                                            image {{
                                                url
                                                altText
                                            }}
                                        }}
                                    }}
                                }}
                            }}
                        }}
                        pageInfo {{
                            hasNextPage
                            hasPreviousPage
                            startCursor
                            endCursor
                        }}
                    }}
                }}";
        }
        
        private static string BuildDateFilterQuery(string? dateFilter)
        {
            if (string.IsNullOrEmpty(dateFilter))
                return "";

            return dateFilter.ToLower() switch
            {
                "today" => $"created_at:>={DateTime.UtcNow.Date:yyyy-MM-dd}",
                "yesterday" => $"created_at:>={DateTime.UtcNow.Date.AddDays(-1):yyyy-MM-dd} AND created_at:<{DateTime.UtcNow.Date:yyyy-MM-dd}",
                "week" => $"created_at:>={DateTime.UtcNow.Date.AddDays(-7):yyyy-MM-dd}",
                "month" => $"created_at:>={DateTime.UtcNow.Date.AddDays(-30):yyyy-MM-dd}",
                _ => ""
            };
        }

        public static string GetInventoryByLocationQuery(string locationId, int limit = ShopifyConstants.DefaultProductLimit, string? cursor = null)
        {
            var afterClause = !string.IsNullOrEmpty(cursor) ? $", after: \"{cursor}\"" : "";
            
            return $@"
                query {{
                    products(first: {limit}{afterClause}, sortKey: CREATED_AT, reverse: true) {{
                        edges {{
                            cursor
                            node {{
                                id
                                title
                                status
                                images(first: 1) {{
                                    edges {{
                                        node {{
                                            url
                                            altText
                                        }}
                                    }}
                                }}
                                variants(first: {ShopifyConstants.MaxVariantsPerProduct}) {{
                                    edges {{
                                        node {{
                                            id
                                            sku
                                            barcode
                                            price
                                            compareAtPrice
                                            inventoryItem {{
                                                id
                                                inventoryLevels(first: 10) {{
                                                    edges {{
                                                        node {{
                                                            quantities(names: [""available""]) {{
                                                                quantity
                                                                name
                                                            }}
                                                            location {{
                                                                id
                                                                name
                                                            }}
                                                        }}
                                                    }}
                                                }}
                                            }}
                                        }}
                                    }}
                                }}
                            }}
                        }}
                        pageInfo {{
                            hasNextPage
                            hasPreviousPage
                            startCursor
                            endCursor
                        }}
                    }}
                }}";
        }

        public static string GetLocationsQuery(int limit = 250)
        {
            return $@"
                query {{
                    locations(first: {limit}) {{
                        edges {{
                            node {{
                                id
                                name
                                address {{
                                    address1
                                    city
                                    province
                                    country
                                    zip
                                }}
                            }}
                        }}
                    }}
                }}";
        }

        /// <summary>
        /// GraphQL mutation to update a single product variant
        /// </summary>
        public static string UpdateProductVariantMutation(string productId, string variantId, string? sku = null, string? barcode = null, decimal? price = null, decimal? compareAtPrice = null)
        {
            var inputFields = new List<string>();
            
            inputFields.Add($"id: \"{EscapeGraphQLString(variantId)}\"");
            
            if (!string.IsNullOrEmpty(sku))
                inputFields.Add($"sku: \"{EscapeGraphQLString(sku)}\"");
            
            if (!string.IsNullOrEmpty(barcode))
                inputFields.Add($"barcode: \"{EscapeGraphQLString(barcode)}\"");
            
            if (price.HasValue)
                inputFields.Add($"price: \"{price.Value.ToString("F2", System.Globalization.CultureInfo.InvariantCulture)}\"");
            
            if (compareAtPrice.HasValue)
                inputFields.Add($"compareAtPrice: \"{compareAtPrice.Value.ToString("F2", System.Globalization.CultureInfo.InvariantCulture)}\"");
            
            var inputFieldsString = string.Join(", ", inputFields);
            
            if (string.IsNullOrEmpty(inputFieldsString))
            {
                throw new ArgumentException("At least one field must be provided for update");
            }
            
            return $@"
                mutation {{
                    productVariantsBulkUpdate(
                        productId: ""{EscapeGraphQLString(productId)}""
                        variants: [{{
                            {inputFieldsString}
                        }}]
                        allowPartialUpdates: true
                    ) {{
                        productVariants {{
                            id
                            sku
                            barcode
                            price
                            compareAtPrice
                        }}
                        userErrors {{
                            field
                            message
                        }}
                    }}
                }}";
        }

        /// <summary>
        /// Escape special characters in GraphQL strings
        /// </summary>
        private static string EscapeGraphQLString(string input)
        {
            if (string.IsNullOrEmpty(input))
                return input;
            
            return input
                .Replace("\\", "\\\\")  // Escape backslashes first
                .Replace("\"", "\\\"")  // Escape quotes
                .Replace("\n", "\\n")   // Escape newlines
                .Replace("\r", "\\r")   // Escape carriage returns
                .Replace("\t", "\\t");  // Escape tabs
        }

        /// <summary>
        /// GraphQL mutation to update product title and status
        /// </summary>
        public static string UpdateProductMutation(string productId, string? title = null, string? status = null)
        {
            var inputFields = new List<string>();
            
            if (!string.IsNullOrEmpty(title))
                inputFields.Add($"title: \"{title}\"");
            
            if (!string.IsNullOrEmpty(status))
                inputFields.Add($"status: {status.ToUpper()}");
            
            var inputFieldsString = string.Join(", ", inputFields);
            
            return $@"
                mutation {{
                    productUpdate(input: {{
                        id: ""{productId}""
                        {inputFieldsString}
                    }}) {{
                        product {{
                            id
                            title
                            status
                        }}
                        userErrors {{
                            field
                            message
                        }}
                    }}
                }}";
        }

        /// <summary>
        /// GraphQL mutation to update inventory quantity for a variant
        /// </summary>
        public static string UpdateInventoryLevelMutation(string inventoryItemId, string locationId, int availableQuantity)
        {
            return $@"
                mutation {{
                    inventoryAdjustQuantities(input: {{
                        reason: ""correction""
                        name: ""available""
                        changes: [{{
                            inventoryItemId: ""{inventoryItemId}""
                            locationId: ""{locationId}""
                            quantity: {availableQuantity}
                        }}]
                    }}) {{
                        inventoryAdjustmentGroup {{
                            createdAt
                            reason
                            changes {{
                                name
                                delta
                                quantityAfterChange
                                item {{
                                    id
                                }}
                                location {{
                                    id
                                }}
                            }}
                        }}
                        userErrors {{
                            field
                            message
                        }}
                    }}
                }}";
        }

        /// <summary>
        /// GraphQL query to get a single variant with its inventory item ID
        /// </summary>
        public static string GetVariantWithInventoryQuery(string variantId)
        {
            return $@"
                query {{
                    productVariant(id: ""{variantId}"") {{
                        id
                        sku
                        barcode
                        price
                        compareAtPrice
                        inventoryItem {{
                            id
                        }}
                        product {{
                            id
                            title
                        }}
                    }}
                }}";
        }

        /// <summary>
        /// GraphQL query to get all products with pagination (no SKU filtering in GraphQL to avoid syntax errors)
        /// We'll filter by SKU on the backend side
        /// </summary>
        public static string FindProductsBySkuQuery(List<string> skus, int limit = 250, string? cursor = null)
        {
            // Get all products without SKU filtering to avoid GraphQL syntax issues
            // We'll filter the results on the backend by matching SKUs
            var afterClause = !string.IsNullOrEmpty(cursor) ? $", after: \"{cursor}\"" : "";
            
            return $@"
                query {{
                    products(first: {limit}{afterClause}) {{
                        edges {{
                            cursor
                            node {{
                                id
                                title
                                status
                                images(first: 1) {{
                                    edges {{
                                        node {{
                                            url
                                            altText
                                        }}
                                    }}
                                }}
                                variants(first: {ShopifyConstants.MaxVariantsPerProduct}) {{
                                    edges {{
                                        node {{
                                            id
                                            sku
                                            barcode
                                            price
                                            compareAtPrice
                                        }}
                                    }}
                                }}
                            }}
                        }}
                        pageInfo {{
                            hasNextPage
                            endCursor
                        }}
                    }}
                }}";
        }

        /// <summary>
        /// GraphQL query to search for products using a broader search approach
        /// This is used as a fallback when direct SKU matching doesn't find all products
        /// </summary>
        public static string SearchProductsByTermQuery(string searchTerm, int limit = 50)
        {
            return $@"
                query {{
                    products(first: {limit}, query: ""{searchTerm}"") {{
                        edges {{
                            node {{
                                id
                                title
                                status
                                images(first: 1) {{
                                    edges {{
                                        node {{
                                            url
                                            altText
                                        }}
                                    }}
                                }}
                                variants(first: {ShopifyConstants.MaxVariantsPerProduct}) {{
                                    edges {{
                                        node {{
                                            id
                                            sku
                                            barcode
                                            price
                                            compareAtPrice
                                        }}
                                    }}
                                }}
                            }}
                        }}
                    }}
                }}";
        }

        public static string GetProductsByBarcodeQuery(string barcode, int limit = 20)
        {
            // Clean the barcode for the query
            var cleanBarcode = barcode.Trim();
            
            return $@"
                {{
                    productVariants(first: {limit}, query: ""barcode:{cleanBarcode}"") {{
                        edges {{
                                                            node {{
                                    id
                                    title
                                    sku
                                    barcode
                                    price
                                    compareAtPrice
                                    availableForSale
                                    inventoryQuantity
                                    product {{
                                        id
                                        title
                                        handle
                                        description
                                        tags
                                        featuredImage {{
                                            url
                                            altText
                                        }}
                                    }}
                                    image {{
                                        url
                                        altText
                                    }}
                                    selectedOptions {{
                                        name
                                        value
                                    }}
                                }}
                        }}
                        pageInfo {{
                            hasNextPage
                            hasPreviousPage  
                            startCursor
                            endCursor
                        }}
                    }}
                }}";
        }

        public static string GetProductInventoryQuery(string productId, string variantId)
        {
            return $@"
                {{
                    product(id: ""{productId}"") {{
                        id
                        title
                        handle
                        variants(first: 10) {{
                            edges {{
                                node {{
                                    id
                                    title
                                    sku
                                    barcode
                                    price
                                    compareAtPrice
                                    availableForSale
                                    inventoryQuantity
                                    inventoryItem {{
                                        id
                                        inventoryLevels(first: 10) {{
                                            edges {{
                                                node {{
                                                    id
                                                    available
                                                    location {{
                                                        id
                                                        name
                                                    }}
                                                }}
                                            }}
                                        }}
                                    }}
                                }}
                            }}
                        }}
                    }}
                }}";
        }

        public static string SearchProductsByTitleOrSkuQuery(string searchTerm, int limit = 20)
        {
            return $@"
                {{
                    products(first: {limit}, query: ""title:*{searchTerm}* OR sku:*{searchTerm}*"") {{
                        edges {{
                            node {{
                                id
                                title
                                handle
                                description
                                tags
                                featuredImage {{
                                    url
                                    altText
                                }}
                                variants(first: 10) {{
                                    edges {{
                                        node {{
                                            id
                                            title
                                            sku
                                            barcode
                                            price
                                            compareAtPrice
                                            availableForSale
                                            inventoryQuantity
                                            image {{
                                                url
                                                altText
                                            }}
                                            selectedOptions {{
                                                name
                                                value
                                            }}
                                        }}
                                    }}
                                }}
                            }}
                        }}
                        pageInfo {{
                            hasNextPage
                            hasPreviousPage
                            startCursor
                            endCursor
                        }}
                    }}
                }}";
        }

        public static string GetLocationInventoryQuery()
        {
            return @"
                {
                    locations(first: 10) {
                        edges {
                            node {
                                id
                                name
                                address {
                                    address1
                                    city
                                    province
                                    country
                                    zip
                                }
                                fulfillsOnlineOrders
                                isActive
                            }
                        }
                    }
                }";
        }
    }
} 