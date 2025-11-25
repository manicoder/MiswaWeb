using System.Text.Json;
using Mlt.Admin.Api.Models.DTOs;
using Mlt.Admin.Api.GraphQL;
using Mlt.Admin.Api.Models.Shopify;

namespace Mlt.Admin.Api.Services;

public class JobManagementService : IJobManagementService
{
    private readonly IShopifyApiService _shopifyApiService;
    private readonly IOrderPickupService _orderPickupService;
    private readonly ILogger<JobManagementService> _logger;

    public JobManagementService(
        IShopifyApiService shopifyApiService,
        IOrderPickupService orderPickupService,
        ILogger<JobManagementService> logger)
    {
        _shopifyApiService = shopifyApiService;
        _orderPickupService = orderPickupService;
        _logger = logger;
    }

    public async Task<JobManagementResponseDto> GetFulfilledOrdersGroupedByCourierAsync(ShopifyCredentials credentials, int limit = 250, string? cursor = null, string? dateFilter = null)
    {
        try
        {
            // Execute GraphQL query for fulfilled orders
            var query = ShopifyQueries.GetFulfilledOrdersWithTrackingQuery(limit, cursor, dateFilter);
            var response = await _shopifyApiService.ExecuteGraphQLQueryAsync<object>(credentials, query);

            if (!response.Success || response.Data == null)
            {
                _logger.LogError("Failed to fetch fulfilled orders: {Error}", response.Error);
                return new JobManagementResponseDto();
            }

            // Parse the response
            var allOrders = ParseShopifyOrdersResponse(response.Data);
            
            // Filter orders by fulfillment date
            var orders = FilterOrdersByFulfillmentDate(allOrders, dateFilter);
            
            // Populate pickup status for each order
            await PopulatePickupStatusAsync(orders);
            
            // Group orders by courier company
            var courierGroups = GroupOrdersByCourier(orders);
            
            // Extract pagination info
            var paginationInfo = ExtractPaginationInfo(response.Data);

            return new JobManagementResponseDto
            {
                CourierGroups = courierGroups,
                TotalOrders = orders.Count,
                NextCursor = paginationInfo.endCursor,
                HasNextPage = paginationInfo.hasNextPage
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetFulfilledOrdersGroupedByCourierAsync");
            throw;
        }
    }

    public async Task<object> GetCourierSummaryAsync(ShopifyCredentials credentials)
    {
        try
        {
            var ordersResponse = await GetFulfilledOrdersGroupedByCourierAsync(credentials, 250);
            
            var summary = ordersResponse.CourierGroups.Select(group => new
            {
                CourierName = group.CourierName,
                OrderCount = group.OrderCount,
                TotalValue = group.Orders.Sum(o => o.TotalAmount),
                Currency = group.Orders.FirstOrDefault()?.Currency ?? "INR"
            }).OrderByDescending(s => s.OrderCount).ToList();

            return new
            {
                TotalCouriers = summary.Count,
                TotalOrders = ordersResponse.TotalOrders,
                Couriers = summary
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetCourierSummaryAsync");
            throw;
        }
    }

    private List<JobManagementOrderDto> ParseShopifyOrdersResponse(object responseData)
    {
        var orders = new List<JobManagementOrderDto>();

        try
        {
            var json = JsonSerializer.Serialize(responseData);
            var jsonDoc = JsonDocument.Parse(json);
            
            if (!jsonDoc.RootElement.TryGetProperty("data", out var dataElement) ||
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
                {
                    orders.Add(order);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parsing Shopify orders response");
        }

        return orders;
    }

    private JobManagementOrderDto? ParseSingleOrder(JsonElement orderNode)
    {
        try
        {
            var order = new JobManagementOrderDto
            {
                Id = GetStringProperty(orderNode, "id"),
                Name = GetStringProperty(orderNode, "name"),
                CreatedAt = GetDateTimeProperty(orderNode, "createdAt"),
                FulfillmentStatus = GetStringProperty(orderNode, "displayFulfillmentStatus"),
                FinancialStatus = GetStringProperty(orderNode, "displayFinancialStatus")
            };

            // Parse total amount
            if (orderNode.TryGetProperty("totalPriceSet", out var totalPriceSet) &&
                totalPriceSet.ValueKind == JsonValueKind.Object &&
                totalPriceSet.TryGetProperty("shopMoney", out var shopMoney) &&
                shopMoney.ValueKind == JsonValueKind.Object)
            {
                order.TotalAmount = GetDecimalProperty(shopMoney, "amount");
                order.Currency = GetStringProperty(shopMoney, "currencyCode");
            }

            // Parse customer
            if (orderNode.TryGetProperty("customer", out var customerElement))
            {
                order.Customer = new CustomerInfoDto
                {
                    FirstName = GetStringProperty(customerElement, "firstName"),
                    LastName = GetStringProperty(customerElement, "lastName"),
                    Email = GetStringProperty(customerElement, "email")
                };
            }

            // Parse shipping address
            if (orderNode.TryGetProperty("shippingAddress", out var shippingElement))
            {
                order.ShippingAddress = ParseShippingAddress(shippingElement);
            }

            // Parse fulfillments
            if (orderNode.TryGetProperty("fulfillments", out var fulfillmentsElement))
            {
                order.Fulfillments = ParseFulfillments(fulfillmentsElement);
            }

            // Parse line items
            if (orderNode.TryGetProperty("lineItems", out var lineItemsElement))
            {
                order.LineItems = ParseLineItems(lineItemsElement);
            }

            return order;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parsing single order");
            return null;
        }
    }

    private ShippingAddressDto ParseShippingAddress(JsonElement shippingElement)
    {
        return new ShippingAddressDto
        {
            Name = GetStringProperty(shippingElement, "name"),
            FirstName = GetStringProperty(shippingElement, "firstName"),
            LastName = GetStringProperty(shippingElement, "lastName"),
            Address1 = GetStringProperty(shippingElement, "address1"),
            Address2 = GetStringProperty(shippingElement, "address2"),
            City = GetStringProperty(shippingElement, "city"),
            Province = GetStringProperty(shippingElement, "province"),
            Country = GetStringProperty(shippingElement, "country"),
            Zip = GetStringProperty(shippingElement, "zip"),
            Phone = GetStringProperty(shippingElement, "phone")
        };
    }

    private List<FulfillmentDto> ParseFulfillments(JsonElement fulfillmentsElement)
    {
        var fulfillments = new List<FulfillmentDto>();

        try
        {
            foreach (var fulfillmentElement in fulfillmentsElement.EnumerateArray())
            {
                var fulfillment = new FulfillmentDto
                {
                    Id = GetStringProperty(fulfillmentElement, "id"),
                    Status = GetStringProperty(fulfillmentElement, "status"),
                    CreatedAt = GetDateTimeProperty(fulfillmentElement, "createdAt"),
                    UpdatedAt = GetDateTimeProperty(fulfillmentElement, "updatedAt")
                };

                // Parse tracking info (trackingInfo is an array)
                if (fulfillmentElement.TryGetProperty("trackingInfo", out var trackingElement) && 
                    trackingElement.ValueKind == JsonValueKind.Array && 
                    trackingElement.GetArrayLength() > 0)
                {
                    var firstTracking = trackingElement[0];
                    fulfillment.TrackingInfo = new TrackingInfoDto
                    {
                        Number = GetStringProperty(firstTracking, "number"),
                        Url = GetStringProperty(firstTracking, "url"),
                        Company = GetStringProperty(firstTracking, "company")
                    };
                }

                // Parse service info
                if (fulfillmentElement.TryGetProperty("service", out var serviceElement))
                {
                    fulfillment.Service = new FulfillmentServiceDto
                    {
                        ServiceName = GetStringProperty(serviceElement, "serviceName"),
                        Type = GetStringProperty(serviceElement, "type")
                    };
                }

                fulfillments.Add(fulfillment);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parsing fulfillments");
        }

        return fulfillments;
    }

    private List<LineItemDto> ParseLineItems(JsonElement lineItemsElement)
    {
        var lineItems = new List<LineItemDto>();

        try
        {
            if (lineItemsElement.TryGetProperty("edges", out var edgesElement))
            {
                foreach (var edge in edgesElement.EnumerateArray())
                {
                    if (!edge.TryGetProperty("node", out var itemNode))
                        continue;

                    var lineItem = new LineItemDto
                    {
                        Id = GetStringProperty(itemNode, "id"),
                        Title = GetStringProperty(itemNode, "title"),
                        Quantity = GetIntProperty(itemNode, "quantity")
                    };

                    // Parse amount
                    if (itemNode.TryGetProperty("originalTotalSet", out var totalSet) &&
                        totalSet.ValueKind == JsonValueKind.Object &&
                        totalSet.TryGetProperty("shopMoney", out var shopMoney) &&
                        shopMoney.ValueKind == JsonValueKind.Object)
                    {
                        lineItem.Amount = GetDecimalProperty(shopMoney, "amount");
                        lineItem.Currency = GetStringProperty(shopMoney, "currencyCode");
                    }

                    // Parse image
                    if (itemNode.TryGetProperty("image", out var imageElement))
                    {
                        lineItem.Image = new ProductImageDto
                        {
                            Url = GetStringProperty(imageElement, "url"),
                            AltText = GetStringProperty(imageElement, "altText")
                        };
                    }

                    lineItems.Add(lineItem);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parsing line items");
        }

        return lineItems;
    }

    private List<JobManagementOrderDto> FilterOrdersByFulfillmentDate(List<JobManagementOrderDto> orders, string? dateFilter)
    {
        if (string.IsNullOrEmpty(dateFilter))
            return orders;

        var now = DateTime.UtcNow;
        var filteredOrders = new List<JobManagementOrderDto>();

        foreach (var order in orders)
        {
            // Find the fulfillment date (when the order was fulfilled)
            var fulfillmentDate = order.Fulfillments
                .Where(f => f.CreatedAt != DateTime.MinValue)
                .OrderBy(f => f.CreatedAt)
                .FirstOrDefault()?.CreatedAt;

            if (fulfillmentDate == null || fulfillmentDate == DateTime.MinValue)
                continue;

            var fulfillmentDateValue = fulfillmentDate.Value.Date;
            
            var shouldInclude = dateFilter.ToLower() switch
            {
                "today" => fulfillmentDateValue == now.Date,
                "yesterday" => fulfillmentDateValue == now.Date.AddDays(-1),
                "7days" => fulfillmentDateValue >= now.Date.AddDays(-7) && fulfillmentDateValue <= now.Date,
                "30days" => fulfillmentDateValue >= now.Date.AddDays(-30) && fulfillmentDateValue <= now.Date,
                _ => true
            };

            if (shouldInclude)
            {
                filteredOrders.Add(order);
            }
        }

        _logger.LogInformation($"Filtered {orders.Count} orders to {filteredOrders.Count} orders for date filter: {dateFilter}");
        return filteredOrders;
    }

    private async Task PopulatePickupStatusAsync(List<JobManagementOrderDto> orders)
    {
        try
        {
            foreach (var order in orders)
            {
                // Find the primary tracking number for this order
                var trackingNumber = order.Fulfillments
                    .Where(f => f.TrackingInfo?.Number != null)
                    .FirstOrDefault()?.TrackingInfo?.Number;

                if (!string.IsNullOrEmpty(trackingNumber))
                {
                    var pickupStatus = await _orderPickupService.GetPickupStatusAsync(order.Id, trackingNumber);
                    order.PickupStatus = pickupStatus;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error populating pickup status for orders");
            // Don't throw - pickup status is optional data
        }
    }

    private List<CourierGroupDto> GroupOrdersByCourier(List<JobManagementOrderDto> orders)
    {
        var courierGroups = orders
            .GroupBy(o => {
                // Find the first fulfillment with tracking info
                var trackingCompany = o.Fulfillments
                    .Where(f => f.TrackingInfo?.Company != null)
                    .FirstOrDefault()?.TrackingInfo?.Company;
                    
                return string.IsNullOrEmpty(trackingCompany) ? "No Tracking Info" : trackingCompany;
            })
            .Select(g => new CourierGroupDto
            {
                CourierName = g.Key,
                OrderCount = g.Count(),
                Orders = g.OrderByDescending(o => {
                    // Sort by fulfillment date instead of order creation date
                    var fulfillmentDate = o.Fulfillments
                        .Where(f => f.CreatedAt != DateTime.MinValue)
                        .OrderBy(f => f.CreatedAt)
                        .FirstOrDefault()?.CreatedAt;
                    return fulfillmentDate ?? o.CreatedAt;
                }).ToList()
            })
            .OrderByDescending(g => g.OrderCount)
            .ToList();

        return courierGroups;
    }

    private (string? endCursor, bool hasNextPage) ExtractPaginationInfo(object responseData)
    {
        try
        {
            var json = JsonSerializer.Serialize(responseData);
            var jsonDoc = JsonDocument.Parse(json);
            
            if (jsonDoc.RootElement.TryGetProperty("data", out var dataElement) &&
                dataElement.TryGetProperty("orders", out var ordersElement) &&
                ordersElement.TryGetProperty("pageInfo", out var pageInfoElement))
            {
                var endCursor = GetStringProperty(pageInfoElement, "endCursor");
                var hasNextPage = GetBoolProperty(pageInfoElement, "hasNextPage");
                
                return (endCursor, hasNextPage);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error extracting pagination info");
        }

        return (null, false);
    }

    // Helper methods for JSON parsing
    private string GetStringProperty(JsonElement element, string propertyName)
    {
        return element.TryGetProperty(propertyName, out var prop) && prop.ValueKind == JsonValueKind.String 
            ? prop.GetString() ?? string.Empty 
            : string.Empty;
    }

    private int GetIntProperty(JsonElement element, string propertyName)
    {
        return element.TryGetProperty(propertyName, out var prop) && prop.ValueKind == JsonValueKind.Number 
            ? prop.GetInt32() 
            : 0;
    }

    private decimal GetDecimalProperty(JsonElement element, string propertyName)
    {
        if (element.TryGetProperty(propertyName, out var prop))
        {
            if (prop.ValueKind == JsonValueKind.Number)
                return prop.GetDecimal();
            if (prop.ValueKind == JsonValueKind.String && decimal.TryParse(prop.GetString(), out var result))
                return result;
        }
        return 0m;
    }

    private bool GetBoolProperty(JsonElement element, string propertyName)
    {
        return element.TryGetProperty(propertyName, out var prop) && prop.ValueKind == JsonValueKind.True;
    }

    private DateTime GetDateTimeProperty(JsonElement element, string propertyName)
    {
        if (element.TryGetProperty(propertyName, out var prop) && prop.ValueKind == JsonValueKind.String)
        {
            if (DateTime.TryParse(prop.GetString(), out var result))
                return result;
        }
        return DateTime.MinValue;
    }
} 