using System.Text.Json;
using Mlt.Admin.Api.Constants;

namespace Mlt.Admin.Api.Helpers
{
    public static class ShopifyResponseParser
    {
        public static List<object> ParseProductsResponse(JsonElement responseData)
        {
            var products = new List<object>();

            if (!responseData.TryGetProperty("data", out var dataElement) ||
                !dataElement.TryGetProperty("products", out var productsElement) ||
                !productsElement.TryGetProperty("edges", out var edgesElement))
            {
                return products;
            }

            foreach (var edge in edgesElement.EnumerateArray())
            {
                if (!edge.TryGetProperty("node", out var productNode))
                    continue;

                var product = ParseSingleProduct(productNode);
                if (product != null)
                    products.Add(product);
            }

            return products;
        }

        public static object? ParseSingleProduct(JsonElement productNode)
        {
            try
            {
                var productId = GetStringProperty(productNode, "id");
                var title = GetStringProperty(productNode, "title");
                var bodyHtml = GetStringProperty(productNode, "bodyHtml");
                var vendor = GetStringProperty(productNode, "vendor");
                var productType = GetStringProperty(productNode, "productType");
                var createdAt = GetStringProperty(productNode, "createdAt");
                var updatedAt = GetStringProperty(productNode, "updatedAt");
                var status = GetStringProperty(productNode, "status");
                var tags = ParseTagsArray(productNode);

                var variants = ParseVariants(productNode);
                var images = ParseImages(productNode);

                return new
                {
                    id = productId,
                    title = title,
                    body_html = bodyHtml,
                    vendor = vendor,
                    product_type = productType,
                    created_at = createdAt,
                    updated_at = updatedAt,
                    status = status.ToLower(),
                    tags = tags,
                    variants = variants,
                    images = images,
                    image = images.FirstOrDefault()
                };
            }
            catch (Exception)
            {
                return null;
            }
        }

        public static List<object> ParseVariants(JsonElement productNode)
        {
            var variants = new List<object>();

            if (!productNode.TryGetProperty("variants", out var variantsElement) ||
                !variantsElement.TryGetProperty("edges", out var variantEdges))
            {
                return variants;
            }

            foreach (var variantEdge in variantEdges.EnumerateArray())
            {
                if (!variantEdge.TryGetProperty("node", out var variantNode))
                    continue;

                try
                {
                    var price = GetStringProperty(variantNode, "price", ShopifyConstants.DefaultPrice);

                    variants.Add(new
                    {
                        id = GetStringProperty(variantNode, "id"),
                        title = GetStringProperty(variantNode, "title"),
                        price = price,
                        priceV2 = new
                        {
                            amount = price,
                            currencyCode = "INR" // Default currency
                        },
                        compare_at_price = GetStringProperty(variantNode, "compareAtPrice"),
                        sku = GetStringProperty(variantNode, "sku"),
                        barcode = GetStringProperty(variantNode, "barcode"),
                        inventory_quantity = GetIntProperty(variantNode, "inventoryQuantity")
                    });
                }
                catch (Exception)
                {
                    // Skip invalid variants
                    continue;
                }
            }

            return variants;
        }

        public static List<object> ParseImages(JsonElement productNode)
        {
            var images = new List<object>();

            if (!productNode.TryGetProperty("images", out var imagesElement) ||
                !imagesElement.TryGetProperty("edges", out var imageEdges))
            {
                return images;
            }

            foreach (var imageEdge in imageEdges.EnumerateArray())
            {
                if (!imageEdge.TryGetProperty("node", out var imageNode))
                    continue;

                try
                {
                    images.Add(new
                    {
                        id = GetStringProperty(imageNode, "id"),
                        src = GetStringProperty(imageNode, "url"),
                        alt = GetStringProperty(imageNode, "altText"),
                        width = GetIntProperty(imageNode, "width"),
                        height = GetIntProperty(imageNode, "height")
                    });
                }
                catch (Exception)
                {
                    // Skip invalid images
                    continue;
                }
            }

            return images;
        }

        public static string ParseTagsArray(JsonElement productNode)
        {
            if (!productNode.TryGetProperty("tags", out var tagsElement))
                return string.Empty;

            try
            {
                if (tagsElement.ValueKind == JsonValueKind.Array)
                {
                    var tagsList = new List<string>();
                    foreach (var tag in tagsElement.EnumerateArray())
                    {
                        var tagValue = tag.GetString();
                        if (!string.IsNullOrEmpty(tagValue))
                            tagsList.Add(tagValue);
                    }
                    return string.Join(", ", tagsList);
                }
                else
                {
                    return tagsElement.GetString() ?? string.Empty;
                }
            }
            catch (Exception)
            {
                return string.Empty;
            }
        }

        public static List<object> ParseOrdersResponse(JsonElement responseData)
        {
            var orders = new List<object>();

            if (!responseData.TryGetProperty("data", out var dataElement) ||
                !dataElement.TryGetProperty("orders", out var ordersElement) ||
                !ordersElement.TryGetProperty("edges", out var edgesElement))
            {
                return orders;
            }

            foreach (var edge in edgesElement.EnumerateArray())
            {
                if (!edge.TryGetProperty("node", out var orderNode))
                    continue;

                var order = ParseSingleOrder(orderNode);
                if (order != null)
                    orders.Add(order);
            }

            return orders;
        }

        public static List<object> ParseCustomersResponse(JsonElement responseData)
        {
            var customers = new List<object>();

            if (!responseData.TryGetProperty("data", out var dataElement) ||
                !dataElement.TryGetProperty("customers", out var customersElement) ||
                !customersElement.TryGetProperty("edges", out var edgesElement))
            {
                return customers;
            }

            foreach (var edge in edgesElement.EnumerateArray())
            {
                if (!edge.TryGetProperty("node", out var customerNode))
                    continue;

                var customer = ParseSingleCustomer(customerNode);
                if (customer != null)
                    customers.Add(customer);
            }

            return customers;
        }

        public static object? ParseSingleOrder(JsonElement orderNode)
        {
            try
            {
                return new
                {
                    id = GetStringProperty(orderNode, "id"),
                    name = GetStringProperty(orderNode, "name"),
                    email = GetStringProperty(orderNode, "email"),
                    created_at = GetStringProperty(orderNode, "createdAt"),
                    updated_at = GetStringProperty(orderNode, "updatedAt"),
                    processed_at = GetStringProperty(orderNode, "processedAt"),
                    cancelled_at = GetStringProperty(orderNode, "cancelledAt"),
                    closed_at = GetStringProperty(orderNode, "closedAt"),
                    total_price = ParseMoneyAmount(orderNode, "totalPriceSet"),
                    subtotal_price = ParseMoneyAmount(orderNode, "subtotalPriceSet"),
                    total_tax = ParseMoneyAmount(orderNode, "totalTaxSet"),
                    total_shipping_price = ParseMoneyAmount(orderNode, "totalShippingPriceSet"),
                    financial_status = GetStringProperty(orderNode, "displayFinancialStatus"),
                    fulfillment_status = GetStringProperty(orderNode, "displayFulfillmentStatus"),
                    confirmed = GetBoolProperty(orderNode, "confirmed"),
                    closed = GetBoolProperty(orderNode, "closed"),
                    cancelled = GetBoolProperty(orderNode, "cancelled"),
                    customer = ParseCustomer(orderNode),
                    shipping_address = ParseAddress(orderNode, "shippingAddress"),
                    billing_address = ParseAddress(orderNode, "billingAddress"),
                    line_items = ParseLineItems(orderNode),
                    fulfillments = ParseFulfillments(orderNode)
                };
            }
            catch (Exception)
            {
                return null;
            }
        }

        public static object? ParseSingleCustomer(JsonElement customerNode)
        {
            try
            {
                var customerId = GetStringProperty(customerNode, "id");
                var firstName = GetStringProperty(customerNode, "firstName");
                var lastName = GetStringProperty(customerNode, "lastName");
                var email = GetStringProperty(customerNode, "email");
                var phone = GetStringProperty(customerNode, "phone");
                var createdAt = GetStringProperty(customerNode, "createdAt");
                var updatedAt = GetStringProperty(customerNode, "updatedAt");
                var acceptsMarketing = GetBoolProperty(customerNode, "acceptsMarketing");
                var state = GetStringProperty(customerNode, "state");
                var ordersCount = GetIntProperty(customerNode, "ordersCount");
                var totalSpent = GetStringProperty(customerNode, "totalSpent");
                var tags = ParseCustomerTags(customerNode);

                var lastOrder = ParseLastOrder(customerNode);
                var defaultAddress = ParseCustomerAddress(customerNode, "defaultAddress");
                var addresses = ParseCustomerAddresses(customerNode);

                return new
                {
                    id = customerId,
                    first_name = firstName,
                    last_name = lastName,
                    email = email,
                    phone = phone,
                    created_at = createdAt,
                    updated_at = updatedAt,
                    accepts_marketing = acceptsMarketing,
                    state = state,
                    orders_count = ordersCount,
                    total_spent = totalSpent,
                    tags = tags,
                    last_order = lastOrder,
                    default_address = defaultAddress,
                    addresses = addresses
                };
            }
            catch (Exception)
            {
                return null;
            }
        }

        private static string GetStringProperty(JsonElement element, string propertyName, string defaultValue = "")
        {
            return element.TryGetProperty(propertyName, out var property) ? 
                   property.GetString() ?? defaultValue : defaultValue;
        }

        private static int GetIntProperty(JsonElement element, string propertyName, int defaultValue = 0)
        {
            return element.TryGetProperty(propertyName, out var property) ? 
                   property.GetInt32() : defaultValue;
        }

        private static bool GetBoolProperty(JsonElement element, string propertyName, bool defaultValue = false)
        {
            return element.TryGetProperty(propertyName, out var property) ? 
                   property.GetBoolean() : defaultValue;
        }

        private static string ParseMoneyAmount(JsonElement orderNode, string priceSetProperty)
        {
            if (orderNode.TryGetProperty(priceSetProperty, out var priceSet) &&
                priceSet.TryGetProperty("shopMoney", out var shopMoney) &&
                shopMoney.TryGetProperty("amount", out var amount))
            {
                return amount.GetString() ?? "0";
            }
            return "0";
        }

        private static object? ParseCustomer(JsonElement orderNode)
        {
            if (!orderNode.TryGetProperty("customer", out var customer))
                return null;

            return new
            {
                id = GetStringProperty(customer, "id"),
                first_name = GetStringProperty(customer, "firstName"),
                last_name = GetStringProperty(customer, "lastName"),
                email = GetStringProperty(customer, "email"),
                phone = GetStringProperty(customer, "phone")
            };
        }

        private static object? ParseAddress(JsonElement orderNode, string addressProperty)
        {
            if (!orderNode.TryGetProperty(addressProperty, out var address))
                return null;

            return new
            {
                first_name = GetStringProperty(address, "firstName"),
                last_name = GetStringProperty(address, "lastName"),
                company = GetStringProperty(address, "company"),
                address1 = GetStringProperty(address, "address1"),
                address2 = GetStringProperty(address, "address2"),
                city = GetStringProperty(address, "city"),
                province = GetStringProperty(address, "province"),
                country = GetStringProperty(address, "country"),
                zip = GetStringProperty(address, "zip"),
                phone = GetStringProperty(address, "phone")
            };
        }

        private static List<object> ParseLineItems(JsonElement orderNode)
        {
            var lineItems = new List<object>();

            if (!orderNode.TryGetProperty("lineItems", out var lineItemsElement) ||
                !lineItemsElement.TryGetProperty("edges", out var edges))
            {
                return lineItems;
            }

            foreach (var edge in edges.EnumerateArray())
            {
                if (!edge.TryGetProperty("node", out var lineItem))
                    continue;

                try
                {
                    lineItems.Add(new
                    {
                        id = GetStringProperty(lineItem, "id"),
                        title = GetStringProperty(lineItem, "title"),
                        quantity = GetIntProperty(lineItem, "quantity"),
                        variant = ParseLineItemVariant(lineItem),
                        original_unit_price = ParseMoneyAmount(lineItem, "originalUnitPriceSet"),
                        discounted_unit_price = ParseMoneyAmount(lineItem, "discountedUnitPriceSet")
                    });
                }
                catch (Exception)
                {
                    continue;
                }
            }

            return lineItems;
        }

        private static object? ParseLineItemVariant(JsonElement lineItem)
        {
            if (!lineItem.TryGetProperty("variant", out var variant))
                return null;

            var product = variant.TryGetProperty("product", out var productElement) ? new
            {
                id = GetStringProperty(productElement, "id"),
                title = GetStringProperty(productElement, "title"),
                handle = GetStringProperty(productElement, "handle")
            } : null;

            return new
            {
                id = GetStringProperty(variant, "id"),
                title = GetStringProperty(variant, "title"),
                price = GetStringProperty(variant, "price"),
                sku = GetStringProperty(variant, "sku"),
                barcode = GetStringProperty(variant, "barcode"),
                product = product
            };
        }

        private static List<object> ParseFulfillments(JsonElement orderNode)
        {
            var fulfillments = new List<object>();

            if (!orderNode.TryGetProperty("fulfillments", out var fulfillmentsArray))
                return fulfillments;

            foreach (var fulfillment in fulfillmentsArray.EnumerateArray())
            {
                try
                {
                    var trackingNumbers = new List<string>();
                    var trackingUrls = new List<string>();

                    if (fulfillment.TryGetProperty("trackingNumbers", out var trackingNumbersArray))
                    {
                        foreach (var trackingNumber in trackingNumbersArray.EnumerateArray())
                        {
                            var number = trackingNumber.GetString();
                            if (!string.IsNullOrEmpty(number))
                                trackingNumbers.Add(number);
                        }
                    }

                    if (fulfillment.TryGetProperty("trackingUrls", out var trackingUrlsArray))
                    {
                        foreach (var trackingUrl in trackingUrlsArray.EnumerateArray())
                        {
                            var url = trackingUrl.GetString();
                            if (!string.IsNullOrEmpty(url))
                                trackingUrls.Add(url);
                        }
                    }

                    fulfillments.Add(new
                    {
                        id = GetStringProperty(fulfillment, "id"),
                        status = GetStringProperty(fulfillment, "status"),
                        created_at = GetStringProperty(fulfillment, "createdAt"),
                        updated_at = GetStringProperty(fulfillment, "updatedAt"),
                        tracking_company = GetStringProperty(fulfillment, "trackingCompany"),
                        tracking_numbers = trackingNumbers,
                        tracking_urls = trackingUrls
                    });
                }
                catch (Exception)
                {
                    continue;
                }
            }

            return fulfillments;
        }

        private static object? ParseLastOrder(JsonElement customerNode)
        {
            if (!customerNode.TryGetProperty("lastOrder", out var lastOrderElement) ||
                lastOrderElement.ValueKind == JsonValueKind.Null)
            {
                return null;
            }

            try
            {
                return new
                {
                    id = GetStringProperty(lastOrderElement, "id"),
                    name = GetStringProperty(lastOrderElement, "name"),
                    created_at = GetStringProperty(lastOrderElement, "createdAt")
                };
            }
            catch (Exception)
            {
                return null;
            }
        }

        private static object? ParseCustomerAddress(JsonElement customerNode, string addressProperty)
        {
            if (!customerNode.TryGetProperty(addressProperty, out var addressElement) ||
                addressElement.ValueKind == JsonValueKind.Null)
            {
                return null;
            }

            try
            {
                return new
                {
                    id = GetStringProperty(addressElement, "id"),
                    first_name = GetStringProperty(addressElement, "firstName"),
                    last_name = GetStringProperty(addressElement, "lastName"),
                    address1 = GetStringProperty(addressElement, "address1"),
                    address2 = GetStringProperty(addressElement, "address2"),
                    city = GetStringProperty(addressElement, "city"),
                    province = GetStringProperty(addressElement, "province"),
                    country = GetStringProperty(addressElement, "country"),
                    zip = GetStringProperty(addressElement, "zip"),
                    phone = GetStringProperty(addressElement, "phone")
                };
            }
            catch (Exception)
            {
                return null;
            }
        }

        private static List<object> ParseCustomerAddresses(JsonElement customerNode)
        {
            var addresses = new List<object>();

            if (!customerNode.TryGetProperty("addresses", out var addressesElement) ||
                !addressesElement.TryGetProperty("edges", out var edgesElement))
            {
                return addresses;
            }

            try
            {
                foreach (var edge in edgesElement.EnumerateArray())
                {
                    if (!edge.TryGetProperty("node", out var addressElement))
                        continue;

                    var address = new
                    {
                        id = GetStringProperty(addressElement, "id"),
                        first_name = GetStringProperty(addressElement, "firstName"),
                        last_name = GetStringProperty(addressElement, "lastName"),
                        address1 = GetStringProperty(addressElement, "address1"),
                        address2 = GetStringProperty(addressElement, "address2"),
                        city = GetStringProperty(addressElement, "city"),
                        province = GetStringProperty(addressElement, "province"),
                        country = GetStringProperty(addressElement, "country"),
                        zip = GetStringProperty(addressElement, "zip"),
                        phone = GetStringProperty(addressElement, "phone")
                    };
                    addresses.Add(address);
                }
            }
            catch (Exception)
            {
                // Return empty list if parsing fails
            }

            return addresses;
        }

        private static string ParseCustomerTags(JsonElement customerNode)
        {
            if (!customerNode.TryGetProperty("tags", out var tagsElement))
                return string.Empty;

            try
            {
                if (tagsElement.ValueKind == JsonValueKind.Array)
                {
                    var tagsList = new List<string>();
                    foreach (var tag in tagsElement.EnumerateArray())
                    {
                        var tagValue = tag.GetString();
                        if (!string.IsNullOrEmpty(tagValue))
                            tagsList.Add(tagValue);
                    }
                    return string.Join(", ", tagsList);
                }
                else
                {
                    return tagsElement.GetString() ?? string.Empty;
                }
            }
            catch (Exception)
            {
                return string.Empty;
            }
        }
    }
} 