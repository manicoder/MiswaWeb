using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Text.Json;
using Mlt.Admin.Api.Models.Shopify;
using Mlt.Admin.Api.Models.DTOs;
using Mlt.Admin.Api.Models;
using Mlt.Admin.Api.Services;
using Mlt.Admin.Api.Constants;
using Mlt.Admin.Api.GraphQL;
using Mlt.Admin.Api.Helpers;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Mlt.Admin.Api.Data;

namespace Mlt.Admin.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ShopifyController : ControllerBase
{
    private readonly IShopifyApiService _shopifyApiService;
    private readonly IStoreConnectionService _storeConnectionService;
    private readonly ILogger<ShopifyController> _logger;
    private readonly ApplicationDbContext _context;

    public ShopifyController(
        IShopifyApiService shopifyApiService,
        IStoreConnectionService storeConnectionService,
        ILogger<ShopifyController> logger,
        ApplicationDbContext context)
    {
        _shopifyApiService = shopifyApiService;
        _storeConnectionService = storeConnectionService;
        _logger = logger;
        _context = context;
    }

    [HttpPost("graphql")]
    public async Task<IActionResult> ExecuteGraphQL([FromBody] ShopifyGraphQLRequest request)
    {
        try
        {
            var credentials = await GetUserShopifyCredentialsAsync();
            if (credentials == null)
            {
                return BadRequest(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = ErrorMessages.NoShopifyStoreConnectionFound
                });
            }

            var result = await _shopifyApiService.ExecuteGraphQLQueryAsync<object>(
                credentials,
                request.Query,
                request.Variables);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, LogMessages.GraphQLQueryFailed, ex.Message);
            return StatusCode(500, new ShopifyApiResponse<object>
            {
                Success = false,
                Error = ex.Message
            });
        }
    }

    [HttpGet("orders")]
    public async Task<IActionResult> GetOrders([FromQuery] Dictionary<string, string>? queryParams = null)
    {
        try
        {
            var credentials = await GetUserShopifyCredentialsAsync();
            if (credentials == null)
            {
                return BadRequest(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = ErrorMessages.NoShopifyStoreConnected
                });
            }

            // Parse query parameters with defaults from constants
            var orderType = queryParams?.GetValueOrDefault("orderType") ?? "all";
            var limit = ShopifyConstants.DefaultOrderLimit;
            var cursor = queryParams?.GetValueOrDefault("after");
            var searchQuery = queryParams?.GetValueOrDefault("search");

            if (queryParams?.ContainsKey("limit") == true)
            {
                int.TryParse(queryParams["limit"], out limit);
                if (limit <= 0) limit = ShopifyConstants.DefaultOrderLimit;
            }

            _logger.LogInformation(LogMessages.FetchingOrders, orderType, limit);

            // Use centralized GraphQL queries based on order type
            string graphqlQuery = orderType.ToLower() switch
            {
                "unfulfilled" => ShopifyQueries.GetUnfulfilledOrdersQuery(),
                "today" => ShopifyQueries.GetTodayOrdersQuery(),
                "all" or _ => ShopifyQueries.GetOrdersQuery(limit, cursor)
            };

            // If search query is provided, use search query instead
            if (!string.IsNullOrEmpty(searchQuery) && orderType.ToLower() == "all")
            {
                graphqlQuery = ShopifyQueries.SearchOrdersQuery(searchQuery, limit, cursor);
            }

            var result = await _shopifyApiService.ExecuteGraphQLQueryAsync<object>(credentials, graphqlQuery);

            // Process GraphQL response and convert to expected format
            if (result == null)
            {
                _logger.LogError(ErrorMessages.GraphQLServiceReturnedNull);
                return StatusCode(500, new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = ErrorMessages.GraphQLServiceReturnedNull
                });
            }

            if (result.Success && result.Data != null)
            {
                var orders = new List<object>();

                try
                {
                    // Parse GraphQL response
                    var responseJson = JsonSerializer.Serialize(result.Data);
                    if (string.IsNullOrEmpty(responseJson))
                    {
                        _logger.LogError(ErrorMessages.EmptyJsonResponseFromShopify);
                        return StatusCode(500, new ShopifyApiResponse<object>
                        {
                            Success = false,
                            Error = ErrorMessages.EmptyJsonResponseFromShopify
                        });
                    }

                    var responseData = JsonSerializer.Deserialize<JsonElement>(responseJson);

                    if (responseData.TryGetProperty("data", out var dataElement) &&
                        dataElement.TryGetProperty("orders", out var ordersElement) &&
                        ordersElement.TryGetProperty("edges", out var edgesElement))
                    {
                        foreach (var edge in edgesElement.EnumerateArray())
                        {
                            if (!edge.TryGetProperty("node", out var orderNode))
                                continue;

                            var orderId = orderNode.TryGetProperty("id", out var idProp) ? idProp.GetString() ?? "" : "";
                            var orderNumber = orderNode.TryGetProperty("name", out var nameProp) ? nameProp.GetString() ?? "" : "";
                            var createdAt = orderNode.TryGetProperty("createdAt", out var createdAtProp) ? createdAtProp.GetString() ?? "" : "";
                            var displayFulfillmentStatus = orderNode.TryGetProperty("displayFulfillmentStatus", out var fulfillmentStatusProp) ? fulfillmentStatusProp.GetString() ?? "" : "";
                            var displayFinancialStatus = orderNode.TryGetProperty("displayFinancialStatus", out var financialStatusProp) ? financialStatusProp.GetString() ?? "" : "";

                            // Get total price and currency
                            string totalPrice = "0.00";
                            string currency = "INR";
                            if (orderNode.TryGetProperty("totalPriceSet", out var totalPriceSet) &&
                                totalPriceSet.TryGetProperty("shopMoney", out var shopMoney))
                            {
                                totalPrice = shopMoney.TryGetProperty("amount", out var amountProp) ? amountProp.GetString() ?? "0.00" : "0.00";
                                currency = shopMoney.TryGetProperty("currencyCode", out var currencyProp) ? currencyProp.GetString() ?? "INR" : "INR";
                            }

                            // Get customer
                            object? customer = null;
                            if (orderNode.TryGetProperty("customer", out var customerNode) && customerNode.ValueKind != JsonValueKind.Null)
                            {
                                customer = new
                                {
                                    firstName = customerNode.TryGetProperty("firstName", out var firstName) ? firstName.GetString() : "",
                                    lastName = customerNode.TryGetProperty("lastName", out var lastName) ? lastName.GetString() : "",
                                    email = customerNode.TryGetProperty("email", out var email) ? email.GetString() : ""
                                };
                            }

                            // Get shipping address
                            object? shippingAddress = null;
                            if (orderNode.TryGetProperty("shippingAddress", out var shippingAddressNode) && shippingAddressNode.ValueKind != JsonValueKind.Null)
                            {
                                shippingAddress = new
                                {
                                    firstName = shippingAddressNode.TryGetProperty("firstName", out var shipFirstName) ? shipFirstName.GetString() : "",
                                    lastName = shippingAddressNode.TryGetProperty("lastName", out var shipLastName) ? shipLastName.GetString() : "",
                                    address1 = shippingAddressNode.TryGetProperty("address1", out var address1) ? address1.GetString() : "",
                                    city = shippingAddressNode.TryGetProperty("city", out var city) ? city.GetString() : "",
                                    province = shippingAddressNode.TryGetProperty("province", out var province) ? province.GetString() : "",
                                    country = shippingAddressNode.TryGetProperty("country", out var country) ? country.GetString() : "",
                                    zip = shippingAddressNode.TryGetProperty("zip", out var zip) ? zip.GetString() : ""
                                };
                            }

                            // Get line items
                            var lineItems = new List<object>();
                            if (orderNode.TryGetProperty("lineItems", out var lineItemsNode) &&
                                lineItemsNode.TryGetProperty("edges", out var lineItemEdges))
                            {
                                foreach (var lineItemEdge in lineItemEdges.EnumerateArray())
                                {
                                    if (!lineItemEdge.TryGetProperty("node", out var lineItemNode))
                                        continue;

                                    var lineItemId = lineItemNode.TryGetProperty("id", out var lineItemIdProp) ? lineItemIdProp.GetString() ?? "" : "";
                                    var title = lineItemNode.TryGetProperty("title", out var titleProp) ? titleProp.GetString() ?? "" : "";
                                    var quantity = lineItemNode.TryGetProperty("quantity", out var quantityProp) ? quantityProp.GetInt32() : 0;

                                    string itemPrice = "0.00";
                                    if (lineItemNode.TryGetProperty("originalTotalSet", out var originalTotalSet) &&
                                        originalTotalSet.TryGetProperty("shopMoney", out var lineItemMoney))
                                    {
                                        itemPrice = lineItemMoney.TryGetProperty("amount", out var amountProp) ? amountProp.GetString() ?? "0.00" : "0.00";
                                    }

                                    object? image = null;
                                    if (lineItemNode.TryGetProperty("image", out var imageNode) && imageNode.ValueKind != JsonValueKind.Null)
                                    {
                                        image = new
                                        {
                                            url = imageNode.TryGetProperty("url", out var urlProp) ? urlProp.GetString() : "",
                                            altText = imageNode.TryGetProperty("altText", out var altTextProp) ? altTextProp.GetString() : ""
                                        };
                                    }

                                    lineItems.Add(new
                                    {
                                        id = lineItemId,
                                        title = title,
                                        quantity = quantity,
                                        originalTotalPrice = itemPrice,
                                        image = image
                                    });
                                }
                            }

                            orders.Add(new
                            {
                                id = orderId,
                                name = orderNumber,
                                orderNumber = orderNumber,
                                createdAt = createdAt,
                                updatedAt = createdAt,
                                totalPrice = totalPrice,
                                currency = currency,
                                fulfillmentStatus = displayFulfillmentStatus.ToLower(),
                                displayFulfillmentStatus = displayFulfillmentStatus,
                                displayFinancialStatus = displayFinancialStatus,
                                platform = "shopify",
                                status = displayFulfillmentStatus.ToLower(),
                                customer = customer,
                                shippingAddress = shippingAddress,
                                lineItems = lineItems
                            });
                        }
                    }

                    // Extract pagination info
                    var pageInfo = new Dictionary<string, object>();
                    if (responseData.TryGetProperty("data", out var dataElementForPageInfo) &&
                        dataElementForPageInfo.TryGetProperty("orders", out var ordersElementForPageInfo) &&
                        ordersElementForPageInfo.TryGetProperty("pageInfo", out var pageInfoElement))
                    {
                        pageInfo["hasNextPage"] = pageInfoElement.TryGetProperty("hasNextPage", out var hasNextProp) ? hasNextProp.GetBoolean() : false;
                        pageInfo["hasPreviousPage"] = pageInfoElement.TryGetProperty("hasPreviousPage", out var hasPrev) ? hasPrev.GetBoolean() : false;
                        pageInfo["startCursor"] = pageInfoElement.TryGetProperty("startCursor", out var startCursor) ? startCursor.GetString() ?? string.Empty : string.Empty;
                        pageInfo["endCursor"] = pageInfoElement.TryGetProperty("endCursor", out var endCursor) ? endCursor.GetString() ?? string.Empty : string.Empty;
                    }

                    var finalResponseData = new
                    {
                        orders = orders,
                        pageInfo = pageInfo,
                        total = orders.Count,
                        hasMore = pageInfo.ContainsKey("hasNextPage") ? (bool)pageInfo["hasNextPage"] : false
                    };

                    var metadata = new Dictionary<string, object>
                    {
                        ["orderType"] = orderType,
                        ["isPaginated"] = orderType.ToLower() == "all",
                        ["requestTime"] = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                        ["source"] = "graphql",
                        ["cursor"] = cursor ?? "",
                        ["searchQuery"] = searchQuery ?? "",
                        ["limit"] = limit
                    };

                    return Ok(new ShopifyApiResponse<object>
                    {
                        Success = true,
                        Data = finalResponseData,
                        Message = string.Format(SuccessMessages.OrdersFetchedSuccessfully, orderType, orders.Count),
                        Metadata = metadata
                    });
                }
                catch (Exception jsonEx)
                {
                    _logger.LogError(jsonEx, string.Format(ErrorMessages.JsonProcessingError, jsonEx.Message));
                    return StatusCode(500, new ShopifyApiResponse<object>
                    {
                        Success = false,
                        Error = string.Format(ErrorMessages.JsonProcessingError, jsonEx.Message)
                    });
                }
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, ErrorMessages.OrderFetchFailed);
            return StatusCode(500, new ShopifyApiResponse<object>
            {
                Success = false,
                Error = ex.Message
            });
        }
    }

    [HttpGet("orders/search")]
    public async Task<IActionResult> SearchOrders([FromQuery] string q)
    {
        try
        {
            var credentials = await GetUserShopifyCredentialsAsync();
            if (credentials == null)
            {
                return BadRequest(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = ErrorMessages.NoShopifyStoreConnectionFound
                });
            }

            if (string.IsNullOrEmpty(q))
            {
                return BadRequest(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = ErrorMessages.SearchQueryParameterRequired
                });
            }

            // Use centralized GraphQL query
            var graphqlQuery = ShopifyQueries.SearchOrdersQuery(q);

            _logger.LogInformation(LogMessages.SearchingOrders, q);
            var result = await _shopifyApiService.ExecuteGraphQLQueryAsync<object>(credentials, graphqlQuery);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, string.Format(ErrorMessages.OrderSearchFailed, q));
            return StatusCode(500, new ShopifyApiResponse<object>
            {
                Success = false,
                Error = ex.Message
            });
        }
    }

    [HttpGet("status")]
    public async Task<IActionResult> GetConnectionStatus()
    {
        try
        {
            var credentials = await GetUserShopifyCredentialsAsync();
            if (credentials == null)
            {
                return Ok(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Data = new { isConnected = false },
                    Message = ErrorMessages.NoShopifyStoreConnected
                });
            }

            var isValid = await _shopifyApiService.ValidateCredentialsAsync(credentials);

            return Ok(new ShopifyApiResponse<object>
            {
                Success = true,
                Data = new
                {
                    isConnected = isValid,
                    store = new
                    {
                        id = "",
                        storeName = credentials.Store,
                        shopDomain = $"{credentials.Store}.myshopify.com",
                        isConnected = isValid,
                        connectedAt = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                        status = isValid ? "active" : "error"
                    }
                },
                Message = isValid ? SuccessMessages.StoreConnectedSuccessfully : ErrorMessages.ConnectionVerificationFailed
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, ErrorMessages.ConnectionHealthCheckFailed);
            return Ok(new ShopifyApiResponse<object>
            {
                Success = false,
                Data = new { isConnected = false },
                Error = ErrorMessages.FailedToCheckConnectionStatus
            });
        }
    }

    [HttpPost("verify")]
    public async Task<IActionResult> VerifyConnection()
    {
        try
        {
            var credentials = await GetUserShopifyCredentialsAsync();
            if (credentials == null)
            {
                return BadRequest(new ShopifyApiResponse<bool>
                {
                    Success = false,
                    Data = false,
                    Error = ErrorMessages.NoShopifyStoreConnectionFound
                });
            }

            var isValid = await _shopifyApiService.ValidateCredentialsAsync(credentials);

            return Ok(new ShopifyApiResponse<bool>
            {
                Success = isValid,
                Data = isValid,
                Message = isValid ? SuccessMessages.ConnectionVerified : ErrorMessages.ConnectionVerificationFailed
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, ErrorMessages.ConnectionVerificationFailed);
            return StatusCode(500, new ShopifyApiResponse<bool>
            {
                Success = false,
                Data = false,
                Error = ex.Message
            });
        }
    }

    [HttpPost("disconnect")]
    public IActionResult DisconnectStore()
    {
        try
        {
            // For now, just return success since we don't store connection state server-side
            // The frontend will clear localStorage
            return Ok(new ShopifyApiResponse<object>
            {
                Success = true,
                Message = SuccessMessages.StoreDisconnectedSuccessfully
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, ErrorMessages.StoreDisconnectionFailed);
            return StatusCode(500, new ShopifyApiResponse<object>
            {
                Success = false,
                Error = ex.Message
            });
        }
    }

    [HttpGet("health")]
    public async Task<IActionResult> HealthCheck()
    {
        try
        {
            var credentials = await GetUserShopifyCredentialsAsync();
            if (credentials == null)
            {
                return BadRequest(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = ErrorMessages.NoShopifyStoreConnectionFound
                });
            }

            var isValid = await _shopifyApiService.ValidateCredentialsAsync(credentials);

            return Ok(new ShopifyApiResponse<object>
            {
                Success = isValid,
                Data = new { connected = isValid, store = credentials.Store },
                Message = isValid ? SuccessMessages.ConnectionHealthy : ErrorMessages.ConnectionVerificationFailed
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, ErrorMessages.ConnectionHealthCheckFailed);
            return StatusCode(500, new ShopifyApiResponse<object>
            {
                Success = false,
                Error = ex.Message
            });
        }
    }

    [HttpGet("test")]
    public IActionResult Test()
    {
        return Ok(new
        {
            message = "Shopify GraphQL API is working - Use POST /api/shopify/graphql with your GraphQL queries",
            timestamp = DateTime.UtcNow,
            version = "GraphQL Only"
        });
    }

    [HttpGet("products/debug")]
    [AllowAnonymous]
    public async Task<IActionResult> DebugProducts()
    {
        try
        {
            // Check if there are any products in the database
            var totalProducts = await _context.ShopifyProducts.CountAsync();
            var totalStoreConnections = await _context.StoreConnections.CountAsync();
            
            // Get some sample products
            var sampleProducts = await _context.ShopifyProducts
                .Take(5)
                .Select(p => new
                {
                    id = p.ShopifyProductId,
                    title = p.Title,
                    status = p.Status,
                    storeConnectionId = p.StoreConnectionId
                })
                .ToListAsync();

            // Get store connections
            var storeConnections = await _context.StoreConnections
                .Take(5)
                .Select(sc => new
                {
                    id = sc.Id,
                    store = sc.StoreName,
                    platform = sc.Platform,
                    isActive = sc.IsActive
                })
                .ToListAsync();

            return Ok(new
            {
                success = true,
                data = new
                {
                    totalProducts = totalProducts,
                    totalStoreConnections = totalStoreConnections,
                    sampleProducts = sampleProducts,
                    storeConnections = storeConnections,
                    message = "Debug information retrieved successfully"
                }
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                success = false,
                error = ex.Message,
                stackTrace = ex.StackTrace
            });
        }
    }

    [HttpGet("products")]
    [AllowAnonymous] // Temporarily allow anonymous access for testing
    public async Task<IActionResult> GetProducts(
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 50,
        [FromQuery] string? method = "window") // Default to most modern method
    {
        // Set a longer timeout for this endpoint
        HttpContext.RequestAborted.Register(() => _logger.LogInformation("Request was aborted for products endpoint"));
        
        try
        {
            _logger.LogInformation("GetProducts called with search={Search}, status={Status}, page={Page}, limit={Limit}, method={Method}",
                search, status, page, limit, method);

            // First, let's check if we have any products in the database
            var totalProducts = await _context.ShopifyProducts.CountAsync();
            _logger.LogInformation("Total products in database: {TotalProducts}", totalProducts);

            if (totalProducts == 0)
            {
                return Ok(new ShopifyApiResponse<object>
                {
                    Success = true,
                    Data = new
                    {
                        products = new object[0],
                        pageInfo = new
                        {
                            hasNextPage = false,
                            hasPreviousPage = false,
                            currentPage = page,
                            totalPages = 0,
                            pageSize = limit
                        },
                        total = 0,
                        page = page,
                        pageSize = limit,
                        totalPages = 0,
                        hasMore = false,
                        hasPrevious = false
                    },
                    Message = "No products found in database. Please sync products first."
                });
            }

            // Try to get credentials, but don't fail if not found
            var credentials = await GetUserShopifyCredentialsAsync();
            var userId = GetCurrentUserId();

            // Get store connection ID - try to find any active Shopify connection
            var storeConnectionDto = await _storeConnectionService.GetDefaultStoreConnectionAsync(userId ?? Guid.Empty, "shopify");
            
            StoreConnection? storeConnection = null;
            if (storeConnectionDto == null)
            {
                // Try to find any Shopify store connection
                storeConnection = await _context.StoreConnections
                    .Where(sc => sc.Platform == "shopify" && sc.IsActive)
                    .FirstOrDefaultAsync();
            }
            else
            {
                // Get the actual StoreConnection entity from the DTO
                storeConnection = await _context.StoreConnections
                    .FirstOrDefaultAsync(sc => sc.Id == storeConnectionDto.Id);
            }

            if (storeConnection == null)
            {
                _logger.LogWarning("No store connection found, returning all products");
                
                // Return all products without filtering by store connection
                var allProducts = await _context.ShopifyProducts
                    .Include(p => p.Variants)
                    .OrderByDescending(p => p.ShopifyUpdatedAt)
                    .Skip((page - 1) * limit)
                    .Take(limit)
                    .ToListAsync();

                var products = allProducts.Select(p => new
                {
                    id = p.ShopifyProductId,
                    title = p.Title,
                    handle = p.Handle,
                    bodyHtml = p.BodyHtml,
                    vendor = p.Vendor,
                    productType = p.ProductType,
                    createdAt = p.ShopifyCreatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                    updatedAt = p.ShopifyUpdatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                    publishedAt = p.ShopifyPublishedAt?.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                    status = p.Status,
                    tags = p.Tags?.Split(',').Where(t => !string.IsNullOrEmpty(t.Trim())).ToArray() ?? new string[0],
                    variants = p.Variants.Select(v => new
                    {
                        id = v.ShopifyVariantId,
                        title = v.Title,
                        price = v.Price.ToString("F2"),
                        compareAtPrice = v.CompareAtPrice?.ToString("F2"),
                        sku = v.Sku,
                        barcode = v.Barcode,
                        inventoryQuantity = v.InventoryQuantity
                    }).ToArray(),
                    images = string.IsNullOrEmpty(p.ImageUrl) ? new object[0] : new[]
                    {
                        new
                        {
                            id = "local-image-1",
                            url = p.ImageUrl,
                            altText = p.ImageAltText,
                            width = p.ImageWidth,
                            height = p.ImageHeight
                        }
                    }
                }).ToList();

                var total = await _context.ShopifyProducts.CountAsync();
                var totalPages = (int)Math.Ceiling((double)total / limit);

                return Ok(new ShopifyApiResponse<object>
                {
                    Success = true,
                    Data = new
                    {
                        products = products,
                        pageInfo = new
                        {
                            hasNextPage = page < totalPages,
                            hasPreviousPage = page > 1,
                            currentPage = page,
                            totalPages = totalPages,
                            pageSize = limit
                        },
                        total = total,
                        page = page,
                        pageSize = limit,
                        totalPages = totalPages,
                        hasMore = page < totalPages,
                        hasPrevious = page > 1
                    },
                    Message = $"Successfully fetched {products.Count} products (no store connection)"
                });
            }

            var syncService = HttpContext.RequestServices.GetRequiredService<IShopifyProductSyncService>();

            // Check if products exist locally, if not sync them first
            if (!await syncService.HasLocalProductsAsync(storeConnection.Id))
            {
                _logger.LogInformation("No local products found for store {StoreConnectionId}, initiating sync", storeConnection.Id);

                var syncResult = await syncService.SyncProductsAsync(storeConnection.Id, false);
                if (!syncResult.Success)
                {
                    _logger.LogError("Failed to sync products: {Error}", syncResult.Error);
                    return StatusCode(500, new ShopifyApiResponse<object>
                    {
                        Success = false,
                        Error = $"Failed to sync products: {syncResult.Error}"
                    });
                }

                _logger.LogInformation("Successfully synced {ProductCount} products for first-time access", syncResult.TotalFetched);
            }

            // Choose pagination method based on parameter
            ProductListResult localProducts;
            string source;

            switch (method?.ToLower())
            {
                case "window":
                    // Most modern: PostgreSQL Window Functions - O(log n) performance
                    localProducts = await syncService.GetLocalProductsWithWindowAsync(storeConnection.Id, search, status, page, limit);
                    source = "window_function_pagination";
                    break;

                case "offset":
                    // Traditional: Offset-based pagination
                    localProducts = await syncService.GetLocalProductsAsync(storeConnection.Id, search, status, page, limit);
                    source = "offset_pagination";
                    break;

                default:
                    // Default to most modern method
                    localProducts = await syncService.GetLocalProductsWithWindowAsync(storeConnection.Id, search, status, page, limit);
                    source = "window_function_pagination";
                    break;
            }

            // Convert to response format matching existing structure
            var productList = localProducts.Products.Select(p => new
            {
                id = p.ShopifyProductId,
                title = p.Title,
                handle = p.Handle,
                bodyHtml = p.BodyHtml,
                vendor = p.Vendor,
                productType = p.ProductType,
                createdAt = p.ShopifyCreatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                updatedAt = p.ShopifyUpdatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                publishedAt = p.ShopifyPublishedAt?.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                status = p.Status,
                tags = p.Tags?.Split(',').Where(t => !string.IsNullOrEmpty(t.Trim())).ToArray() ?? new string[0],
                variants = p.Variants.Select(v => new
                {
                    id = v.ShopifyVariantId,
                    title = v.Title,
                    price = v.Price.ToString("F2"),
                    compareAtPrice = v.CompareAtPrice?.ToString("F2"),
                    sku = v.Sku,
                    barcode = v.Barcode,
                    inventoryQuantity = v.InventoryQuantity
                }).ToArray(),
                images = string.IsNullOrEmpty(p.ImageUrl) ? new object[0] : new[]
                {
                    new
                    {
                        id = "local-image-1",
                        url = p.ImageUrl,
                        altText = p.ImageAltText,
                        width = p.ImageWidth,
                        height = p.ImageHeight
                    }
                }
            }).ToList();

            var responseData = new
            {
                products = productList,
                pageInfo = new
                {
                    hasNextPage = localProducts.HasMore,
                    hasPreviousPage = localProducts.HasPrevious,
                    currentPage = localProducts.Page,
                    totalPages = localProducts.TotalPages,
                    pageSize = localProducts.PageSize
                },
                total = localProducts.Total,
                page = localProducts.Page,
                pageSize = localProducts.PageSize,
                totalPages = localProducts.TotalPages,
                hasMore = localProducts.HasMore,
                hasPrevious = localProducts.HasPrevious
            };

            var metadata = new Dictionary<string, object>
            {
                ["page"] = localProducts.Page,
                ["pageSize"] = localProducts.PageSize,
                ["totalPages"] = localProducts.TotalPages,
                ["searchQuery"] = search ?? "",
                ["statusFilter"] = status ?? "",
                ["paginationMethod"] = method ?? "window",
                ["requestTime"] = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                ["source"] = source
            };

            return Ok(new ShopifyApiResponse<object>
            {
                Success = true,
                Data = responseData,
                Message = $"Successfully fetched {productList.Count} products",
                Metadata = metadata
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching products with parameters: search={Search}, status={Status}, page={Page}, limit={Limit}, method={Method}",
                search, status, page, limit, method);

            // Add more detailed error information for debugging
            var errorDetails = new Dictionary<string, object>
            {
                ["message"] = ex.Message,
                ["stackTrace"] = ex.StackTrace ?? "No stack trace",
                ["innerException"] = ex.InnerException?.Message ?? "No inner exception",
                ["source"] = ex.Source ?? "No source",
                ["requestPath"] = HttpContext.Request.Path.Value ?? "No path",
                ["requestMethod"] = HttpContext.Request.Method ?? "No method",
                ["timestamp"] = DateTime.UtcNow.ToString("o")
            };

            return StatusCode(500, new ShopifyApiResponse<object>
            {
                Success = false,
                Error = ex.Message,
                Metadata = errorDetails
            });
        }
    }

    [HttpGet("products/{id}")]
    public async Task<IActionResult> GetProduct(string id)
    {
        try
        {
            _logger.LogInformation("🔍 GetProduct called with ID: {ProductId}", id);

            // URL decode the product ID to handle encoded GraphQL IDs
            var decodedId = Uri.UnescapeDataString(id);
            _logger.LogInformation("🔍 Decoded ID: {DecodedId}", decodedId);

            var credentials = await GetUserShopifyCredentialsAsync();
            if (credentials == null)
            {
                return BadRequest(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = ErrorMessages.NoShopifyStoreConnectionFound
                });
            }

            // Use centralized GraphQL query with decoded ID
            _logger.LogInformation("🔍 Creating GraphQL query for decoded product ID: {ProductId}", decodedId);
            var graphqlQuery = ShopifyQueries.GetSingleProductQuery(decodedId);

            var result = await _shopifyApiService.ExecuteGraphQLQueryAsync<object>(credentials, graphqlQuery);
            return Ok(result);
        }
        catch (Exception ex)
        {
            // URL decode for logging consistency
            var decodedId = Uri.UnescapeDataString(id);
            _logger.LogError(ex, LogMessages.FetchingProduct, decodedId);
            return StatusCode(500, new ShopifyApiResponse<object>
            {
                Success = false,
                Error = ex.Message
            });
        }
    }

    [HttpPost("products/sync")]
    public async Task<IActionResult> SyncProducts([FromQuery] bool forceRefresh = false)
    {
        try
        {
            var credentials = await GetUserShopifyCredentialsAsync();
            if (credentials == null)
            {
                return BadRequest(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = ErrorMessages.NoShopifyStoreConnectionFound
                });
            }

            // Get store connection ID
            var storeConnection = await _storeConnectionService.GetDefaultStoreConnectionAsync(GetCurrentUserId() ?? Guid.Empty, "shopify");
            if (storeConnection == null)
            {
                return BadRequest(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = "Store connection not found"
                });
            }

            var syncService = HttpContext.RequestServices.GetRequiredService<IShopifyProductSyncService>();
            var result = await syncService.SyncProductsAsync(storeConnection.Id, forceRefresh);

            if (result.Success)
            {
                return Ok(new ShopifyApiResponse<object>
                {
                    Success = true,
                    Data = new
                    {
                        synced = result.NewProducts + result.UpdatedProducts,
                        totalFetched = result.TotalFetched,
                        newProducts = result.NewProducts,
                        updatedProducts = result.UpdatedProducts,
                        totalVariants = result.TotalVariants,
                        durationMs = (int)result.Duration.TotalMilliseconds
                    },
                    Message = $"Successfully synced {result.TotalFetched} products with {result.TotalVariants} variants in {result.Duration.TotalMilliseconds:F0}ms"
                });
            }
            else
            {
                return BadRequest(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = result.Error ?? "Product sync failed"
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, ErrorMessages.ProductSyncFailed);
            return StatusCode(500, new ShopifyApiResponse<object>
            {
                Success = false,
                Error = ex.Message
            });
        }
    }

    // NEW: Order sync endpoints (similar to product sync)
    [HttpPost("orders/sync")]
    public async Task<IActionResult> SyncOrders([FromQuery] bool forceRefresh = false)
    {
        try
        {
            var credentials = await GetUserShopifyCredentialsAsync();
            if (credentials == null)
            {
                return BadRequest(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = ErrorMessages.NoShopifyStoreConnectionFound
                });
            }

            // Get store connection ID
            var storeConnection = await _storeConnectionService.GetDefaultStoreConnectionAsync(GetCurrentUserId() ?? Guid.Empty, "shopify");
            if (storeConnection == null)
            {
                return BadRequest(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = "Store connection not found"
                });
            }

            var syncService = HttpContext.RequestServices.GetRequiredService<IShopifyOrderSyncService>();
            var result = await syncService.SyncOrdersAsync(storeConnection.Id, forceRefresh);

            if (result.Success)
            {
                return Ok(new ShopifyApiResponse<object>
                {
                    Success = true,
                    Data = new
                    {
                        synced = result.NewOrders + result.UpdatedOrders,
                        totalFetched = result.TotalFetched,
                        newOrders = result.NewOrders,
                        updatedOrders = result.UpdatedOrders,
                        totalLineItems = result.TotalLineItems,
                        durationMs = (int)result.Duration.TotalMilliseconds
                    },
                    Message = $"Successfully synced {result.TotalFetched} orders with {result.TotalLineItems} line items in {result.Duration.TotalMilliseconds:F0}ms"
                });
            }
            else
            {
                return BadRequest(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = result.Error ?? "Order sync failed"
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Order sync failed");
            return StatusCode(500, new ShopifyApiResponse<object>
            {
                Success = false,
                Error = ex.Message
            });
        }
    }

    [HttpPost("orders/sync/incremental")]
    public async Task<IActionResult> IncrementalSyncOrders([FromQuery] DateTime? sinceDate = null)
    {
        try
        {
            var storeConnection = await _storeConnectionService.GetDefaultStoreConnectionAsync(GetCurrentUserId() ?? Guid.Empty, "shopify");
            if (storeConnection == null)
            {
                return BadRequest(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = "Store connection not found"
                });
            }

            var syncService = HttpContext.RequestServices.GetRequiredService<IShopifyOrderSyncService>();
            var result = await syncService.IncrementalSyncOrdersAsync(storeConnection.Id, sinceDate);

            if (result.Success)
            {
                return Ok(new ShopifyApiResponse<object>
                {
                    Success = true,
                    Data = new
                    {
                        synced = result.NewOrders + result.UpdatedOrders,
                        totalFetched = result.TotalFetched,
                        newOrders = result.NewOrders,
                        updatedOrders = result.UpdatedOrders,
                        totalLineItems = result.TotalLineItems,
                        durationMs = (int)result.Duration.TotalMilliseconds
                    },
                    Message = $"Successfully synced {result.TotalFetched} updated orders with {result.TotalLineItems} line items in {result.Duration.TotalMilliseconds:F0}ms"
                });
            }
            else
            {
                return BadRequest(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = result.Error ?? "Incremental order sync failed"
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Incremental order sync failed");
            return StatusCode(500, new ShopifyApiResponse<object>
            {
                Success = false,
                Error = ex.Message
            });
        }
    }

    [HttpPost("orders/sync/recent")]
    public async Task<IActionResult> SyncRecentOrders([FromQuery] int daysBack = 30)
    {
        try
        {
            var storeConnection = await _storeConnectionService.GetDefaultStoreConnectionAsync(GetCurrentUserId() ?? Guid.Empty, "shopify");
            if (storeConnection == null)
            {
                return BadRequest(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = "Store connection not found"
                });
            }

            var syncService = HttpContext.RequestServices.GetRequiredService<IShopifyOrderSyncService>();
            var result = await syncService.SyncRecentOrdersAsync(storeConnection.Id, daysBack);

            if (result.Success)
            {
                return Ok(new ShopifyApiResponse<object>
                {
                    Success = true,
                    Data = new
                    {
                        synced = result.NewOrders + result.UpdatedOrders,
                        totalFetched = result.TotalFetched,
                        newOrders = result.NewOrders,
                        updatedOrders = result.UpdatedOrders,
                        totalLineItems = result.TotalLineItems,
                        durationMs = (int)result.Duration.TotalMilliseconds
                    },
                    Message = $"Successfully synced {result.TotalFetched} recent orders (last {daysBack} days) with {result.TotalLineItems} line items in {result.Duration.TotalMilliseconds:F0}ms"
                });
            }
            else
            {
                return BadRequest(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = result.Error ?? "Recent order sync failed"
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Recent order sync failed");
            return StatusCode(500, new ShopifyApiResponse<object>
            {
                Success = false,
                Error = ex.Message
            });
        }
    }

    [HttpPost("orders/sync/unfulfilled")]
    public async Task<IActionResult> SyncUnfulfilledOrders()
    {
        try
        {
            var storeConnection = await _storeConnectionService.GetDefaultStoreConnectionAsync(GetCurrentUserId() ?? Guid.Empty, "shopify");
            if (storeConnection == null)
            {
                return BadRequest(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = "Store connection not found"
                });
            }

            var syncService = HttpContext.RequestServices.GetRequiredService<IShopifyOrderSyncService>();
            var result = await syncService.SyncUnfulfilledOrdersAsync(storeConnection.Id);

            if (result.Success)
            {
                return Ok(new ShopifyApiResponse<object>
                {
                    Success = true,
                    Data = new
                    {
                        synced = result.NewOrders + result.UpdatedOrders,
                        totalFetched = result.TotalFetched,
                        newOrders = result.NewOrders,
                        updatedOrders = result.UpdatedOrders,
                        totalLineItems = result.TotalLineItems,
                        durationMs = (int)result.Duration.TotalMilliseconds
                    },
                    Message = $"Successfully synced {result.TotalFetched} unfulfilled orders with {result.TotalLineItems} line items in {result.Duration.TotalMilliseconds:F0}ms"
                });
            }
            else
            {
                return BadRequest(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = result.Error ?? "Unfulfilled order sync failed"
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unfulfilled order sync failed");
            return StatusCode(500, new ShopifyApiResponse<object>
            {
                Success = false,
                Error = ex.Message
            });
        }
    }

    [HttpGet("orders/sync/stats")]
    public async Task<IActionResult> GetOrderSyncStats()
    {
        try
        {
            var storeConnection = await _storeConnectionService.GetDefaultStoreConnectionAsync(GetCurrentUserId() ?? Guid.Empty, "shopify");
            if (storeConnection == null)
            {
                return BadRequest(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = "Store connection not found"
                });
            }

            var syncService = HttpContext.RequestServices.GetRequiredService<IShopifyOrderSyncService>();
            var stats = await syncService.GetOrderSyncStatsAsync(storeConnection.Id);

            return Ok(new ShopifyApiResponse<object>
            {
                Success = true,
                Data = stats,
                Message = "Order sync statistics retrieved successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get order sync stats");
            return StatusCode(500, new ShopifyApiResponse<object>
            {
                Success = false,
                Error = ex.Message
            });
        }
    }

    [HttpGet("orders/local")]
    public async Task<IActionResult> GetLocalOrders(
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] string? fulfillmentStatus = null,
        [FromQuery] string? startDate = null,
        [FromQuery] string? endDate = null,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 50,
        [FromQuery] string? method = "window")
    {
        try
        {
            // Get store connection
            var storeConnection = await _storeConnectionService.GetDefaultStoreConnectionAsync(GetCurrentUserId() ?? Guid.Empty, "shopify");
            if (storeConnection == null)
            {
                return BadRequest(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = "Store connection not found"
                });
            }

            var syncService = HttpContext.RequestServices.GetRequiredService<IShopifyOrderSyncService>();

            // Do NOT auto-sync if no local orders. Just return empty result if none exist.
            if (!await syncService.HasLocalOrdersAsync(storeConnection.Id))
            {
                var emptyResponse = new
                {
                    orders = new List<object>(),
                    pageInfo = new
                    {
                        hasNextPage = false,
                        hasPreviousPage = false,
                        currentPage = page,
                        totalPages = 0,
                        pageSize = limit
                    },
                    total = 0,
                    page = page,
                    pageSize = limit,
                    totalPages = 0,
                    hasMore = false,
                    hasPrevious = false
                };

                return Ok(new ShopifyApiResponse<object>
                {
                    Success = true,
                    Data = emptyResponse,
                    Message = "No local orders found."
                });
            }

            // Parse date parameters
            DateTime? startDateTime = null;
            DateTime? endDateTime = null;

            if (!string.IsNullOrEmpty(startDate))
            {
                if (DateTime.TryParse(startDate, out var parsedStartDate))
                {
                    startDateTime = DateTime.SpecifyKind(parsedStartDate, DateTimeKind.Utc);
                }
            }

            if (!string.IsNullOrEmpty(endDate))
            {
                if (DateTime.TryParse(endDate, out var parsedEndDate))
                {
                    // Set end date to end of day in UTC
                    endDateTime = DateTime.SpecifyKind(parsedEndDate.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);
                }
            }

            // Use database-backed order methods
            OrderListResult orderResult;
            string source;

            switch (method?.ToLower())
            {
                case "optimized":
                    orderResult = await syncService.GetLocalOrdersOptimizedAsync(storeConnection.Id, search, status, fulfillmentStatus, startDateTime, endDateTime, page, limit);
                    source = "optimized_sql_pagination";
                    break;

                case "cursor":
                    var cursorResult = await syncService.GetLocalOrdersWithCursorAsync(storeConnection.Id, search, status, fulfillmentStatus, startDateTime, endDateTime, null, limit);
                    orderResult = new OrderListResult
                    {
                        Orders = cursorResult.Orders,
                        Total = cursorResult.Total,
                        Page = page,
                        PageSize = limit,
                        TotalPages = (int)Math.Ceiling((double)cursorResult.Total / limit),
                        HasMore = cursorResult.HasNextPage,
                        HasPrevious = cursorResult.HasPreviousPage
                    };
                    source = "cursor_pagination";
                    break;

                default:
                    orderResult = await syncService.GetLocalOrdersAsync(storeConnection.Id, search, status, fulfillmentStatus, startDateTime, endDateTime, page, limit);
                    source = "offset_pagination";
                    break;
            }

            var orders = orderResult.Orders.Select(o => new
            {
                id = o.Id,
                shopifyOrderId = o.ShopifyOrderId,
                name = o.Name,
                orderNumber = o.OrderNumber,
                createdAt = o.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                updatedAt = o.UpdatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                totalPrice = o.TotalPrice.ToString("F2"),
                currency = o.Currency,
                status = o.Status,
                fulfillmentStatus = o.FulfillmentStatus,
                displayFulfillmentStatus = o.DisplayFulfillmentStatus,
                displayFinancialStatus = o.DisplayFinancialStatus,
                customer = o.CustomerEmail != null ? new
                {
                    firstName = o.CustomerFirstName,
                    lastName = o.CustomerLastName,
                    email = o.CustomerEmail
                } : null,
                shippingAddress = o.ShippingFirstName != null ? new
                {
                    firstName = o.ShippingFirstName,
                    lastName = o.ShippingLastName,
                    address1 = o.ShippingAddress1,
                    city = o.ShippingCity,
                    province = o.ShippingProvince,
                    country = o.ShippingCountry,
                    zip = o.ShippingZip
                } : null,
                lineItems = JsonSerializer.Deserialize<List<object>>(o.LineItemsJson ?? "[]")
            }).ToList();

            var responseData = new
            {
                orders = orders,
                pageInfo = new
                {
                    hasNextPage = orderResult.HasMore,
                    hasPreviousPage = orderResult.HasPrevious,
                    currentPage = orderResult.Page,
                    totalPages = orderResult.TotalPages,
                    pageSize = orderResult.PageSize
                },
                total = orderResult.Total,
                page = orderResult.Page,
                pageSize = orderResult.PageSize,
                totalPages = orderResult.TotalPages,
                hasMore = orderResult.HasMore,
                hasPrevious = orderResult.HasPrevious
            };

            var metadata = new Dictionary<string, object>
            {
                ["page"] = orderResult.Page,
                ["pageSize"] = orderResult.PageSize,
                ["totalPages"] = orderResult.TotalPages,
                ["searchQuery"] = search ?? "",
                ["statusFilter"] = status ?? "",
                ["fulfillmentStatusFilter"] = fulfillmentStatus ?? "",
                ["paginationMethod"] = method ?? "window",
                ["requestTime"] = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                ["source"] = source
            };

            return Ok(new ShopifyApiResponse<object>
            {
                Success = true,
                Data = responseData,
                Message = $"Successfully fetched {orders.Count} orders",
                Metadata = metadata
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch orders from database");
            return StatusCode(500, new ShopifyApiResponse<object>
            {
                Success = false,
                Error = ex.Message
            });
        }
    }

    [HttpGet("orders/count")]
    public async Task<IActionResult> GetOrderCount()
    {
        try
        {
            // Get store connection
            var storeConnection = await _storeConnectionService.GetDefaultStoreConnectionAsync(GetCurrentUserId() ?? Guid.Empty, "shopify");
            if (storeConnection == null)
            {
                return BadRequest(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = "Store connection not found"
                });
            }

            var syncService = HttpContext.RequestServices.GetRequiredService<IShopifyOrderSyncService>();

            // Get order counts from database
            var counts = await syncService.GetLocalOrderCountAsync(storeConnection.Id);

            var responseData = new
            {
                total = counts.Total,
                fulfilled = counts.Fulfilled,
                unfulfilled = counts.Unfulfilled,
                cancelled = counts.Cancelled,
                pending = counts.Pending,
                paid = counts.Paid,
                unpaid = counts.Unpaid,
                refunded = counts.Refunded
            };

            return Ok(new ShopifyApiResponse<object>
            {
                Success = true,
                Data = responseData,
                Message = "Order counts fetched successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch order counts from database");
            return StatusCode(500, new ShopifyApiResponse<object>
            {
                Success = false,
                Error = ex.Message
            });
        }
    }

    [HttpGet("orders/{orderId}/cost-analysis")]
    public async Task<IActionResult> GetOrderCostAnalysis(string orderId)
    {
        try
        {
            // Get store connection
            var storeConnection = await _storeConnectionService.GetDefaultStoreConnectionAsync(GetCurrentUserId() ?? Guid.Empty, "shopify");
            if (storeConnection == null)
            {
                return BadRequest(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = "Store connection not found"
                });
            }

            // Get the order from database
            var order = await _context.ShopifyOrders
                .FirstOrDefaultAsync(o => o.ShopifyOrderId == orderId && o.StoreConnectionId == storeConnection.Id);

            if (order == null)
            {
                return NotFound(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = "Order not found"
                });
            }

            // Calculate total cost
            var totalCost = ShopifyOrderSyncService.CalculateOrderCost(order.LineItemsJson);
            var totalRevenue = order.TotalPrice;
            var profit = totalRevenue - totalCost;
            var profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

            // Parse line items for detailed analysis
            var lineItemsAnalysis = new List<object>();
            if (!string.IsNullOrEmpty(order.LineItemsJson))
            {
                try
                {
                    var lineItems = JsonSerializer.Deserialize<List<JsonElement>>(order.LineItemsJson);
                    if (lineItems != null)
                    {
                        foreach (var item in lineItems)
                        {
                            var lineItemId = item.TryGetProperty("id", out var idElement) ? idElement.GetString() : "";
                            var title = item.TryGetProperty("title", out var titleElement) ? titleElement.GetString() : "";
                            var quantity = item.TryGetProperty("quantity", out var quantityElement) ? quantityElement.GetInt32() : 0;
                            
                            // Get cost per item
                            var costPerItem = ShopifyOrderSyncService.GetCostPerItem(order.LineItemsJson, lineItemId ?? "");
                            var totalItemCost = costPerItem * quantity;

                            // Get revenue for this item
                            decimal itemRevenue = 0;
                            if (item.TryGetProperty("originalTotalSet", out var totalSet) &&
                                totalSet.TryGetProperty("shopMoney", out var shopMoney) &&
                                shopMoney.TryGetProperty("amount", out var amount) &&
                                amount.ValueKind != JsonValueKind.Null &&
                                decimal.TryParse(amount.GetString(), out var totalAmount))
                            {
                                itemRevenue = totalAmount;
                            }

                            var itemProfit = itemRevenue - totalItemCost;
                            var itemProfitMargin = itemRevenue > 0 ? (itemProfit / itemRevenue) * 100 : 0;

                            lineItemsAnalysis.Add(new
                            {
                                lineItemId = lineItemId,
                                title = title,
                                quantity = quantity,
                                costPerItem = costPerItem,
                                totalItemCost = totalItemCost,
                                itemRevenue = itemRevenue,
                                itemProfit = itemProfit,
                                itemProfitMargin = Math.Round(itemProfitMargin, 2)
                            });
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error parsing line items for cost analysis");
                }
            }

            var responseData = new
            {
                orderId = order.ShopifyOrderId,
                orderName = order.Name,
                totalRevenue = totalRevenue,
                totalCost = totalCost,
                profit = profit,
                profitMargin = Math.Round(profitMargin, 2),
                lineItems = lineItemsAnalysis
            };

            return Ok(new ShopifyApiResponse<object>
            {
                Success = true,
                Data = responseData,
                Message = "Order cost analysis completed successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting order cost analysis");
            return StatusCode(500, new ShopifyApiResponse<object>
            {
                Success = false,
                Error = ex.Message
            });
        }
    }

    // NEW: Database-backed inventory endpoints (same pattern as products)
    [HttpGet("inventory")]
    public async Task<IActionResult> GetInventory(
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] string? inventoryFilter = null,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 50,
        [FromQuery] string? method = "window")
    {
        try
        {
            // Get store connection
            var storeConnection = await _storeConnectionService.GetDefaultStoreConnectionAsync(GetCurrentUserId() ?? Guid.Empty, "shopify");
            if (storeConnection == null)
            {
                return BadRequest(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = "Store connection not found"
                });
            }

            var syncService = HttpContext.RequestServices.GetRequiredService<IShopifyProductSyncService>();

            // Auto-sync if no local products
            if (!await syncService.HasLocalProductsAsync(storeConnection.Id))
            {
                _logger.LogInformation("No local products found for store {StoreConnectionId}, initiating sync", storeConnection.Id);

                var syncResult = await syncService.SyncProductsAsync(storeConnection.Id, false);
                if (!syncResult.Success)
                {
                    return StatusCode(500, new ShopifyApiResponse<object>
                    {
                        Success = false,
                        Error = $"Failed to sync products: {syncResult.Error}"
                    });
                }
            }

            // Use database-backed inventory methods
            ProductListResult inventoryResult;
            string source;

            switch (method?.ToLower())
            {
                case "window":
                    inventoryResult = await syncService.GetLocalInventoryWithWindowAsync(storeConnection.Id, search, status, inventoryFilter, page, limit);
                    source = "window_function_pagination";
                    break;

                case "offset":
                    inventoryResult = await syncService.GetLocalInventoryAsync(storeConnection.Id, search, status, inventoryFilter, page, limit);
                    source = "offset_pagination";
                    break;

                default:
                    inventoryResult = await syncService.GetLocalInventoryWithWindowAsync(storeConnection.Id, search, status, inventoryFilter, page, limit);
                    source = "window_function_pagination";
                    break;
            }

            // Convert to inventory response format (including inventory levels for location filtering)
            var inventory = inventoryResult.Products.SelectMany(p => p.Variants.Select(v => new
            {
                productId = p.ShopifyProductId,
                title = p.Title,
                status = p.Status,
                imageUrl = p.ImageUrl,
                imageAltText = p.ImageAltText,
                variants = new[]
                {
                    new
                    {
                        variantId = v.ShopifyVariantId,
                        sku = v.Sku,
                        barcode = v.Barcode,
                        price = v.Price.ToString("F2"),
                        compareAtPrice = v.CompareAtPrice?.ToString("F2"),
                        inventoryItemId = v.InventoryItemId,
                        available = v.InventoryQuantity,
                        inventoryLevels = v.InventoryLevels?.Select(il => new
                        {
                            locationId = il.LocationId,
                            locationName = il.LocationName,
                            available = il.Available
                        }).ToArray() ?? Array.Empty<object>()
                    }
                }
            })).ToList();

            var responseData = new
            {
                inventory = inventory,
                pageInfo = new
                {
                    hasNextPage = inventoryResult.HasMore,
                    hasPreviousPage = inventoryResult.HasPrevious,
                    currentPage = inventoryResult.Page,
                    totalPages = inventoryResult.TotalPages,
                    pageSize = inventoryResult.PageSize
                },
                total = inventoryResult.Total,
                page = inventoryResult.Page,
                pageSize = inventoryResult.PageSize,
                totalPages = inventoryResult.TotalPages,
                hasMore = inventoryResult.HasMore,
                hasPrevious = inventoryResult.HasPrevious
            };

            var metadata = new Dictionary<string, object>
            {
                ["page"] = inventoryResult.Page,
                ["pageSize"] = inventoryResult.PageSize,
                ["totalPages"] = inventoryResult.TotalPages,
                ["searchQuery"] = search ?? "",
                ["statusFilter"] = status ?? "",
                ["inventoryFilter"] = inventoryFilter ?? "",
                ["paginationMethod"] = method ?? "window",
                ["requestTime"] = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                ["source"] = source
            };

            return Ok(new ShopifyApiResponse<object>
            {
                Success = true,
                Data = responseData,
                Message = $"Successfully fetched {inventory.Count} inventory items",
                Metadata = metadata
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch inventory from database");
            return StatusCode(500, new ShopifyApiResponse<object>
            {
                Success = false,
                Error = ex.Message
            });
        }
    }

    [HttpGet("inventory/count")]
    public async Task<IActionResult> GetInventoryCount()
    {
        try
        {
            // Get store connection
            var storeConnection = await _storeConnectionService.GetDefaultStoreConnectionAsync(GetCurrentUserId() ?? Guid.Empty, "shopify");
            if (storeConnection == null)
            {
                return BadRequest(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = "Store connection not found"
                });
            }

            var syncService = HttpContext.RequestServices.GetRequiredService<IShopifyProductSyncService>();

            // Get inventory counts from database
            var counts = await syncService.GetLocalInventoryCountAsync(storeConnection.Id);

            var responseData = new
            {
                all = counts.All,
                inStock = counts.InStock,
                outOfStock = counts.OutOfStock,
                lowStock = counts.LowStock,
                active = counts.Active,
                draft = counts.Draft,
                archived = counts.Archived
            };

            return Ok(new ShopifyApiResponse<object>
            {
                Success = true,
                Data = responseData,
                Message = "Inventory counts fetched successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch inventory counts");
            return StatusCode(500, new ShopifyApiResponse<object>
            {
                Success = false,
                Error = ex.Message
            });
        }
    }

    // NEW: Database-backed location-specific inventory endpoint
    [HttpGet("inventory/location-database")]
    public async Task<IActionResult> GetInventoryByLocationFromDatabase(
        [FromQuery] string locationId,
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] string? inventoryFilter = null,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 50)
    {
        try
        {
            // Get store connection
            var storeConnection = await _storeConnectionService.GetDefaultStoreConnectionAsync(GetCurrentUserId() ?? Guid.Empty, "shopify");
            if (storeConnection == null)
            {
                return BadRequest(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = "Store connection not found"
                });
            }

            var syncService = HttpContext.RequestServices.GetRequiredService<IShopifyProductSyncService>();

            var result = await syncService.GetLocationSpecificInventoryAsync(
                storeConnection.Id,
                locationId,
                search,
                status,
                inventoryFilter,
                page,
                limit);

            return Ok(new ShopifyApiResponse<ProductListResult>
            {
                Success = true,
                Data = result,
                Message = $"Location-specific inventory retrieved successfully. Found {result.Products.Count} products."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get location-specific inventory from database");
            return StatusCode(500, new ShopifyApiResponse<object>
            {
                Success = false,
                Error = ex.Message
            });
        }
    }

    // EXISTING: Shopify API-based inventory endpoint (kept for backward compatibility)
    [HttpGet("inventory/location")]
    public async Task<IActionResult> GetInventoryByLocation([FromQuery] string locationId, [FromQuery] int limit = 50, [FromQuery] string? after = null)
    {
        try
        {
            // Validate locationId parameter
            if (string.IsNullOrEmpty(locationId))
            {
                return BadRequest(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = "LocationId is required"
                });
            }

            var credentials = await GetUserShopifyCredentialsAsync();
            if (credentials == null)
            {
                return BadRequest(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = ErrorMessages.NoShopifyStoreConnected
                });
            }

            // Use parameters directly
            var cursor = after;

            _logger.LogInformation("Fetching inventory for location: {LocationId} with limit: {Limit}", locationId, limit);

            // Enhanced logging for debugging
            _logger.LogDebug("Using cursor: {Cursor}", cursor ?? "none");

            // Use centralized GraphQL query
            var graphqlQuery = ShopifyQueries.GetInventoryByLocationQuery(locationId, limit, cursor);

            var result = await _shopifyApiService.ExecuteGraphQLQueryAsync<object>(credentials, graphqlQuery);

            if (result.Success && result.Data != null)
            {
                // Parse GraphQL response
                var responseJson = JsonSerializer.Serialize(result.Data);
                _logger.LogInformation("🔍 Full GraphQL Response for location {LocationId}: {Response}", locationId, responseJson);
                var responseData = JsonSerializer.Deserialize<JsonElement>(responseJson);

                var productInventories = new List<object>();
                JsonElement edgesElement = default;
                var totalProductsFetched = 0;
                var totalVariantCount = 0;

                _logger.LogInformation("🔍 Starting to parse products for location {LocationId}", locationId);

                if (responseData.TryGetProperty("data", out var dataElement) &&
                    dataElement.TryGetProperty("products", out var productsElement) &&
                    productsElement.TryGetProperty("edges", out edgesElement))
                {
                    totalProductsFetched = edgesElement.GetArrayLength();
                    _logger.LogInformation("🔍 Found {ProductCount} product edges to process", totalProductsFetched);
                    foreach (var edge in edgesElement.EnumerateArray())
                    {
                        if (!edge.TryGetProperty("node", out var productNode))
                            continue;

                        var productId = productNode.GetProperty("id").GetString() ?? "";
                        var title = productNode.GetProperty("title").GetString() ?? "";
                        var status = productNode.TryGetProperty("status", out var statusElement) ? statusElement.GetString() ?? "unknown" : "unknown";
                        var variants = new List<object>();

                        // Get product image
                        var imageUrl = "";
                        var imageAltText = "";
                        if (productNode.TryGetProperty("images", out var imagesNode) &&
                            imagesNode.TryGetProperty("edges", out var imageEdges) &&
                            imageEdges.GetArrayLength() > 0)
                        {
                            var firstImageEdge = imageEdges[0];
                            if (firstImageEdge.TryGetProperty("node", out var imageNode))
                            {
                                imageUrl = imageNode.GetProperty("url").GetString() ?? "";
                                imageAltText = imageNode.GetProperty("altText").GetString() ?? "";
                            }
                        }

                        _logger.LogInformation("🔍 Processing product: {ProductTitle} (ID: {ProductId})", title, productId);

                        // Process variants
                        if (productNode.TryGetProperty("variants", out var variantsNode) &&
                            variantsNode.TryGetProperty("edges", out var variantEdges))
                        {
                            foreach (var variantEdge in variantEdges.EnumerateArray())
                            {
                                if (!variantEdge.TryGetProperty("node", out var variantNode))
                                    continue;

                                var variantId = variantNode.GetProperty("id").GetString() ?? "";
                                var sku = variantNode.TryGetProperty("sku", out var skuElement) ? skuElement.GetString() ?? "" : "";
                                var barcode = variantNode.TryGetProperty("barcode", out var barcodeElement) ? barcodeElement.GetString() ?? "" : "";
                                var price = variantNode.TryGetProperty("price", out var priceElement) ? priceElement.GetString() ?? "0" : "0";
                                var compareAtPrice = variantNode.TryGetProperty("compareAtPrice", out var compareAtPriceElement) ? compareAtPriceElement.GetString() ?? "" : "";

                                // Debug logging for variant data
                                _logger.LogInformation("🔍 Variant {VariantId}: SKU = '{Sku}', Barcode = '{Barcode}', Price = '{Price}', CompareAt = '{CompareAt}'",
                                    variantId.Split('/').LastOrDefault(), sku, barcode, price, compareAtPrice);

                                var inventoryItemId = "";
                                var available = 0;
                                var hasInventoryForLocation = false;

                                // Get inventory information
                                if (variantNode.TryGetProperty("inventoryItem", out var inventoryItemNode))
                                {
                                    inventoryItemId = inventoryItemNode.GetProperty("id").GetString() ?? "";

                                    if (inventoryItemNode.TryGetProperty("inventoryLevels", out var inventoryLevelsNode) &&
                                        inventoryLevelsNode.TryGetProperty("edges", out var inventoryLevelEdges))
                                    {
                                        foreach (var inventoryLevelEdge in inventoryLevelEdges.EnumerateArray())
                                        {
                                            if (!inventoryLevelEdge.TryGetProperty("node", out var inventoryLevelNode))
                                                continue;

                                            // Check if this inventory level is for the requested location
                                            if (inventoryLevelNode.TryGetProperty("location", out var locationNode) &&
                                                locationNode.TryGetProperty("id", out var locationIdElement))
                                            {
                                                var currentLocationId = locationIdElement.GetString();
                                                _logger.LogInformation("🔍 Found inventory level for location {CurrentLocationId}, looking for {RequestedLocationId}", currentLocationId, locationId);

                                                if (currentLocationId == locationId)
                                                {
                                                    hasInventoryForLocation = true;
                                                    // Get available quantity for this specific location
                                                    if (inventoryLevelNode.TryGetProperty("quantities", out var quantitiesElement))
                                                    {
                                                        foreach (var quantity in quantitiesElement.EnumerateArray())
                                                        {
                                                            if (quantity.TryGetProperty("name", out var nameElement) &&
                                                                nameElement.GetString() == "available" &&
                                                                quantity.TryGetProperty("quantity", out var quantityElement))
                                                            {
                                                                available = quantityElement.GetInt32();
                                                                _logger.LogInformation("🔍 Found matching location! Available: {Available}", available);
                                                                break;
                                                            }
                                                        }
                                                    }
                                                    break; // We found the inventory level for this location
                                                }
                                            }
                                        }
                                    }
                                }

                                // Include all variants regardless of inventory quantity
                                if (hasInventoryForLocation)
                                {
                                    _logger.LogInformation("🔍 Including variant {VariantId} with {Available} available", variantId.Split('/').LastOrDefault(), available);
                                    variants.Add(new
                                    {
                                        variantId = variantId,
                                        sku = sku,
                                        barcode = barcode,
                                        price = price,
                                        compareAtPrice = compareAtPrice,
                                        inventoryItemId = inventoryItemId,
                                        available = available
                                    });
                                }
                                else
                                {
                                    _logger.LogInformation("🔍 Excluding variant {VariantId} - HasInventoryForLocation: {HasInventory}",
                                        variantId.Split('/').LastOrDefault(), hasInventoryForLocation);
                                }
                            }
                        }

                        // Include all products (regardless of inventory) and count all variants
                        totalVariantCount += variants.Count;

                        _logger.LogInformation("🔍 Including product: {ProductTitle} with {VariantCount} variants", title, variants.Count);
                        productInventories.Add(new
                        {
                            productId = productId,
                            title = title,
                            status = status,
                            imageUrl = imageUrl,
                            imageAltText = imageAltText,
                            variants = variants
                        });
                    }
                }

                // Extract pagination info
                var pageInfo = new Dictionary<string, object>();
                if (responseData.TryGetProperty("data", out var dataElementForPagination) &&
                    dataElementForPagination.TryGetProperty("products", out var productsElementForPagination) &&
                    productsElementForPagination.TryGetProperty("pageInfo", out var pageInfoElement))
                {
                    pageInfo["hasNextPage"] = pageInfoElement.GetProperty("hasNextPage").GetBoolean();
                    pageInfo["hasPreviousPage"] = pageInfoElement.TryGetProperty("hasPreviousPage", out var hasPrev) ? hasPrev.GetBoolean() : false;
                    pageInfo["startCursor"] = pageInfoElement.TryGetProperty("startCursor", out var startCursor) ? startCursor.GetString() ?? string.Empty : string.Empty;
                    pageInfo["endCursor"] = pageInfoElement.TryGetProperty("endCursor", out var endCursor) ? endCursor.GetString() ?? string.Empty : string.Empty;
                }

                var responseDataFormatted = new
                {
                    inventory = productInventories,
                    pageInfo = pageInfo,
                    total = productInventories.Count,
                    totalProducts = productInventories.Count,
                    totalVariants = totalVariantCount,
                    limit = limit,
                    hasMore = pageInfo.ContainsKey("hasNextPage") ? (bool)pageInfo["hasNextPage"] : false,
                    locationId = locationId,
                    // Add debug info to help understand the filtering
                    debug = new
                    {
                        totalProductsFetched = totalProductsFetched,
                        productsReturned = productInventories.Count,
                        variantsReturned = totalVariantCount,
                        message = $"Fetched {totalProductsFetched} products from Shopify, returning {productInventories.Count} products with {totalVariantCount} variants"
                    }
                };

                var metadata = new Dictionary<string, object>
                {
                    ["locationId"] = locationId,
                    ["cursor"] = cursor ?? "",
                    ["limit"] = limit,
                    ["requestTime"] = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                    ["source"] = "graphql"
                };

                return Ok(new ShopifyApiResponse<object>
                {
                    Success = true,
                    Data = responseDataFormatted,
                    Message = $"Inventory fetched successfully for location {locationId}. Found {productInventories.Count} products with {totalVariantCount} variants.",
                    Metadata = metadata
                });
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch inventory for location {LocationId}: {Error}", locationId, ex.Message);
            return StatusCode(500, new ShopifyApiResponse<object>
            {
                Success = false,
                Error = ex.Message
            });
        }
    }

    [HttpGet("orders/today")]
    public async Task<IActionResult> GetTodayOrders([FromQuery] Dictionary<string, string>? queryParams = null)
    {
        try
        {
            var credentials = await GetUserShopifyCredentialsAsync();
            if (credentials == null)
            {
                return BadRequest(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = ErrorMessages.NoShopifyStoreConnected
                });
            }

            var limit = int.Parse(queryParams?.GetValueOrDefault("limit", "250") ?? "250");
            var graphqlQuery = ShopifyQueries.GetTodayOrdersQuery(limit);

            var result = await _shopifyApiService.ExecuteGraphQLQueryAsync<object>(credentials, graphqlQuery);

            if (result.Success && result.Data != null)
            {
                var responseJson = JsonSerializer.Serialize(result.Data);
                var responseData = JsonSerializer.Deserialize<JsonElement>(responseJson);

                var orders = ShopifyResponseParser.ParseOrdersResponse(responseData);

                var responseData2 = new
                {
                    orders = orders,
                    total = orders.Count,
                    page = 1,
                    limit = limit,
                    hasMore = false
                };

                return Ok(new ShopifyApiResponse<object>
                {
                    Success = true,
                    Data = responseData2,
                    Message = string.Format(SuccessMessages.OrdersFetchedSuccessfully, orders.Count)
                });
            }

            return BadRequest(new ShopifyApiResponse<object>
            {
                Success = false,
                Error = result.Error ?? ErrorMessages.UnexpectedErrorOccurred
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, LogMessages.OrdersFetchFailed, ex.Message);
            return StatusCode(500, new ShopifyApiResponse<object>
            {
                Success = false,
                Error = ex.Message
            });
        }
    }

    [HttpGet("customers")]
    public async Task<IActionResult> GetCustomers([FromQuery] Dictionary<string, string>? queryParams = null)
    {
        try
        {
            var credentials = await GetUserShopifyCredentialsAsync();
            if (credentials == null)
            {
                return BadRequest(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = ErrorMessages.NoShopifyStoreConnected
                });
            }

            // Parse query parameters with defaults from constants
            var limit = int.Parse(queryParams?.GetValueOrDefault("limit", ShopifyConstants.DefaultOrderLimit.ToString()) ?? ShopifyConstants.DefaultOrderLimit.ToString());
            var search = queryParams?.GetValueOrDefault("search", "");

            // Use centralized GraphQL query
            var graphqlQuery = ShopifyQueries.GetCustomersQuery(limit);

            var result = await _shopifyApiService.ExecuteGraphQLQueryAsync<object>(credentials, graphqlQuery);

            if (result.Success && result.Data != null)
            {
                // Parse GraphQL response using centralized parser
                var responseJson = JsonSerializer.Serialize(result.Data);
                var responseData = JsonSerializer.Deserialize<JsonElement>(responseJson);

                var customers = ShopifyResponseParser.ParseCustomersResponse(responseData);

                var responseData2 = new
                {
                    customers = customers,
                    total = customers.Count,
                    page = 1,
                    limit = limit,
                    hasMore = false
                };

                return Ok(new ShopifyApiResponse<object>
                {
                    Success = true,
                    Data = responseData2,
                    Message = string.Format(SuccessMessages.CustomersFetchedSuccessfully, customers.Count)
                });
            }

            return BadRequest(new ShopifyApiResponse<object>
            {
                Success = false,
                Error = result.Error ?? ErrorMessages.UnexpectedErrorOccurred
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, LogMessages.CustomersFetchFailed, ex.Message);
            return StatusCode(500, new ShopifyApiResponse<object>
            {
                Success = false,
                Error = ex.Message
            });
        }
    }

    [HttpGet("customers/search")]
    public async Task<IActionResult> SearchCustomers([FromQuery] string q)
    {
        try
        {
            var credentials = await GetUserShopifyCredentialsAsync();
            if (credentials == null)
            {
                return BadRequest(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = ErrorMessages.NoShopifyStoreConnected
                });
            }

            if (string.IsNullOrWhiteSpace(q))
            {
                return BadRequest(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = "Search query is required"
                });
            }

            var graphqlQuery = ShopifyQueries.SearchCustomersQuery(q);
            var result = await _shopifyApiService.ExecuteGraphQLQueryAsync<object>(credentials, graphqlQuery);

            if (result.Success && result.Data != null)
            {
                var responseJson = JsonSerializer.Serialize(result.Data);
                var responseData = JsonSerializer.Deserialize<JsonElement>(responseJson);

                var customers = ShopifyResponseParser.ParseCustomersResponse(responseData);

                return Ok(new ShopifyApiResponse<object>
                {
                    Success = true,
                    Data = new
                    {
                        customers = customers,
                        total = customers.Count,
                        query = q
                    },
                    Message = string.Format(SuccessMessages.CustomerSearchSuccessful, customers.Count, q)
                });
            }

            return BadRequest(new ShopifyApiResponse<object>
            {
                Success = false,
                Error = result.Error ?? ErrorMessages.UnexpectedErrorOccurred
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, LogMessages.CustomerSearchFailed, q, ex.Message);
            return StatusCode(500, new ShopifyApiResponse<object>
            {
                Success = false,
                Error = ex.Message
            });
        }
    }

    [HttpGet("products/count")]
    public async Task<IActionResult> GetProductCount()
    {
        try
        {
            var credentials = await GetUserShopifyCredentialsAsync();
            if (credentials == null)
            {
                return BadRequest(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = ErrorMessages.NoShopifyStoreConnected
                });
            }

            var graphqlQuery = ShopifyQueries.GetProductCountQuery();
            var result = await _shopifyApiService.ExecuteGraphQLQueryAsync<object>(credentials, graphqlQuery);

            if (result.Success && result.Data != null)
            {
                var responseJson = JsonSerializer.Serialize(result.Data);
                var responseData = JsonSerializer.Deserialize<JsonElement>(responseJson);

                var totalProducts = 0;
                if (responseData.TryGetProperty("data", out var dataElement) &&
                    dataElement.TryGetProperty("productsCount", out var productsCountElement) &&
                    productsCountElement.TryGetProperty("count", out var countElement))
                {
                    totalProducts = countElement.GetInt32();
                }

                return Ok(new ShopifyApiResponse<object>
                {
                    Success = true,
                    Data = new { totalProducts = totalProducts },
                    Message = $"Total products count: {totalProducts}"
                });
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch product count: {Error}", ex.Message);
            return StatusCode(500, new ShopifyApiResponse<object>
            {
                Success = false,
                Error = ex.Message
            });
        }
    }

    [HttpGet("analytics/top-selling-products/test")]
    [AllowAnonymous]
    public async Task<IActionResult> GetTopSellingProductsTest(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] string? currency = null,
        [FromQuery] int limit = 20)
    {
        try
        {
            var financeService = HttpContext.RequestServices.GetRequiredService<IFinanceService>();
            var topProducts = await financeService.GetTopSellingProductsAsync(startDate, endDate, currency, limit);

            return Ok(new ShopifyApiResponse<object>
            {
                Success = true,
                Data = new
                {
                    topProducts = topProducts,
                    dateRange = new
                    {
                        startDate = startDate?.ToString("yyyy-MM-dd"),
                        endDate = endDate?.ToString("yyyy-MM-dd")
                    },
                    currency = currency ?? "INR",
                    limit = limit
                },
                Message = $"Successfully fetched top {limit} selling products"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching top selling products");
            return StatusCode(500, new ShopifyApiResponse<object>
            {
                Success = false,
                Error = ex.Message
            });
        }
    }

    [HttpGet("analytics/top-selling-products")]
    public async Task<IActionResult> GetTopSellingProducts(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] string? currency = null,
        [FromQuery] int limit = 20)
    {
        try
        {
            var storeConnection = await _storeConnectionService.GetDefaultStoreConnectionAsync(GetCurrentUserId() ?? Guid.Empty, "shopify");
            if (storeConnection == null)
            {
                return BadRequest(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = "Store connection not found"
                });
            }

            var financeService = HttpContext.RequestServices.GetRequiredService<IFinanceService>();
            var topProducts = await financeService.GetTopSellingProductsAsync(startDate, endDate, currency, limit);

            return Ok(new ShopifyApiResponse<object>
            {
                Success = true,
                Data = new
                {
                    topProducts = topProducts,
                    dateRange = new
                    {
                        startDate = startDate?.ToString("yyyy-MM-dd"),
                        endDate = endDate?.ToString("yyyy-MM-dd")
                    },
                    currency = currency ?? "INR",
                    limit = limit
                },
                Message = $"Successfully fetched top {limit} selling products"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching top selling products");
            return StatusCode(500, new ShopifyApiResponse<object>
            {
                Success = false,
                Error = ex.Message
            });
        }
    }

    [HttpGet("locations")]
    public async Task<IActionResult> GetLocations()
    {
        try
        {
            var credentials = await GetUserShopifyCredentialsAsync();
            if (credentials == null)
            {
                return BadRequest(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = ErrorMessages.NoShopifyStoreConnected
                });
            }

            _logger.LogInformation("Fetching locations for store");

            // Use centralized GraphQL query
            var graphqlQuery = ShopifyQueries.GetLocationsQuery();

            var result = await _shopifyApiService.ExecuteGraphQLQueryAsync<object>(credentials, graphqlQuery);

            if (result.Success && result.Data != null)
            {
                // Parse GraphQL response
                var responseJson = JsonSerializer.Serialize(result.Data);
                var responseData = JsonSerializer.Deserialize<JsonElement>(responseJson);

                var locations = new List<object>();

                if (responseData.TryGetProperty("data", out var dataElement) &&
                    dataElement.TryGetProperty("locations", out var locationsElement) &&
                    locationsElement.TryGetProperty("edges", out var edgesElement))
                {
                    foreach (var edge in edgesElement.EnumerateArray())
                    {
                        if (!edge.TryGetProperty("node", out var locationNode))
                            continue;

                        var locationId = locationNode.GetProperty("id").GetString() ?? "";
                        var name = locationNode.GetProperty("name").GetString() ?? "";

                        // Get address
                        object? address = null;
                        if (locationNode.TryGetProperty("address", out var addressNode) && addressNode.ValueKind != JsonValueKind.Null)
                        {
                            address = new
                            {
                                address1 = addressNode.TryGetProperty("address1", out var addr1) ? addr1.GetString() : null,
                                city = addressNode.TryGetProperty("city", out var city) ? city.GetString() : null,
                                province = addressNode.TryGetProperty("province", out var province) ? province.GetString() : null,
                                country = addressNode.TryGetProperty("country", out var country) ? country.GetString() : null,
                                zip = addressNode.TryGetProperty("zip", out var zip) ? zip.GetString() : null
                            };
                        }

                        locations.Add(new
                        {
                            id = locationId,
                            name = name,
                            address = address,
                            isActive = true, // Default to true since we can't get this from simplified query
                            legacy = false, // Default to false
                            fulfillsOnlineOrders = true, // Default to true
                            hasActiveInventory = true // Default to true
                        });
                    }
                }

                var responseDataFormatted = new
                {
                    locations = locations,
                    total = locations.Count
                };

                var metadata = new Dictionary<string, object>
                {
                    ["requestTime"] = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                    ["source"] = "graphql"
                };

                return Ok(new ShopifyApiResponse<object>
                {
                    Success = true,
                    Data = responseDataFormatted,
                    Message = $"Locations fetched successfully. Found {locations.Count} locations.",
                    Metadata = metadata
                });
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch locations: {Error}", ex.Message);
            return StatusCode(500, new ShopifyApiResponse<object>
            {
                Success = false,
                Error = ex.Message
            });
        }
    }

    [HttpPut("inventory/{variantId}")]
    public async Task<IActionResult> UpdateProductVariant(string variantId, [FromBody] UpdateProductVariantDto request)
    {
        // URL decode the variant ID to handle encoded forward slashes
        variantId = Uri.UnescapeDataString(variantId);
        return await UpdateProductVariantInternal(variantId, request);
    }

    [HttpPost("inventory/update-variant")]
    public async Task<IActionResult> UpdateProductVariantPost([FromBody] UpdateProductVariantDto request)
    {
        return await UpdateProductVariantInternal(request.VariantId, request);
    }



    private async Task<IActionResult> UpdateProductVariantInternal(string variantId, UpdateProductVariantDto request)
    {
        try
        {
            var credentials = await GetUserShopifyCredentialsAsync();
            if (credentials == null)
            {
                return BadRequest(new ShopifyApiResponseDto<object>
                {
                    Success = false,
                    Error = ErrorMessages.NoShopifyStoreConnected
                });
            }

            _logger.LogInformation("Updating product variant {VariantId}", variantId);

            // Validate that the variant ID matches the request
            if (request.VariantId != variantId)
            {
                return BadRequest(new ShopifyApiResponseDto<object>
                {
                    Success = false,
                    Error = "Variant ID in URL does not match request body"
                });
            }

            // Validate Shopify ID format
            if (!variantId.StartsWith("gid://shopify/ProductVariant/"))
            {
                return BadRequest(new ShopifyApiResponseDto<object>
                {
                    Success = false,
                    Error = $"Invalid variant ID format: {variantId}. Expected format: gid://shopify/ProductVariant/{{id}}"
                });
            }

            if (!request.ProductId.StartsWith("gid://shopify/Product/"))
            {
                return BadRequest(new ShopifyApiResponseDto<object>
                {
                    Success = false,
                    Error = $"Invalid product ID format: {request.ProductId}. Expected format: gid://shopify/Product/{{id}}"
                });
            }

            var updateTasks = new List<Task<ShopifyApiResponse<object>>>();

            // Update product variant (SKU, barcode, price, compareAtPrice)
            if (!string.IsNullOrEmpty(request.Sku) || !string.IsNullOrEmpty(request.Barcode) ||
                request.Price.HasValue || request.CompareAtPrice.HasValue)
            {
                var variantMutation = ShopifyQueries.UpdateProductVariantMutation(
                    request.ProductId, variantId, request.Sku, request.Barcode, request.Price, request.CompareAtPrice);

                _logger.LogInformation("Executing variant mutation for {VariantId}: {Mutation}", variantId, variantMutation);
                updateTasks.Add(_shopifyApiService.ExecuteGraphQLQueryAsync<object>(credentials, variantMutation));
            }

            // Update product (title, status) - requires separate mutation
            if (!string.IsNullOrEmpty(request.Title) || !string.IsNullOrEmpty(request.Status))
            {
                var productMutation = ShopifyQueries.UpdateProductMutation(
                    request.ProductId, request.Title, request.Status);

                updateTasks.Add(_shopifyApiService.ExecuteGraphQLQueryAsync<object>(credentials, productMutation));
            }

            // Update inventory quantity if provided
            if (request.InventoryQuantity.HasValue)
            {
                // First get the variant to find inventory item ID
                var variantQuery = ShopifyQueries.GetVariantWithInventoryQuery(variantId);
                var variantResult = await _shopifyApiService.ExecuteGraphQLQueryAsync<object>(credentials, variantQuery);

                if (variantResult.Success && variantResult.Data != null)
                {
                    var responseJson = JsonSerializer.Serialize(variantResult.Data);
                    var responseData = JsonSerializer.Deserialize<JsonElement>(responseJson);

                    if (responseData.TryGetProperty("data", out var dataElement) &&
                        dataElement.TryGetProperty("productVariant", out var variantElement) &&
                        variantElement.TryGetProperty("inventoryItem", out var inventoryItemElement))
                    {
                        var inventoryItemId = inventoryItemElement.GetProperty("id").GetString();

                        // Note: We would need the location ID to update inventory
                        // For now, we'll skip inventory updates and recommend using the inventory management interface
                        _logger.LogWarning("Inventory quantity update requested but location ID not provided for variant {VariantId}", variantId);
                    }
                }
            }

            // Execute all update tasks
            var results = await Task.WhenAll(updateTasks);

            // Check for errors
            var errors = new List<string>();
            foreach (var result in results)
            {
                _logger.LogInformation("Update task result - Success: {Success}, Data: {Data}, Error: {Error}",
                    result.Success,
                    result.Data != null ? JsonSerializer.Serialize(result.Data) : "null",
                    result.Error);

                if (!result.Success)
                {
                    _logger.LogError("Update task failed: {Error}", result.Error);
                    errors.Add(result.Error ?? "Unknown error");
                }
                else if (result.Data != null)
                {
                    // Check for GraphQL user errors
                    var resultJson = JsonSerializer.Serialize(result.Data);
                    _logger.LogInformation("GraphQL result for variant {VariantId}: {Result}", variantId, resultJson);
                    var resultData = JsonSerializer.Deserialize<JsonElement>(resultJson);

                    if (resultData.TryGetProperty("data", out var dataElement))
                    {
                        // Check productVariantsBulkUpdate errors
                        if (dataElement.TryGetProperty("productVariantsBulkUpdate", out var variantBulkUpdate) &&
                            variantBulkUpdate.TryGetProperty("userErrors", out var variantErrors) &&
                            variantErrors.GetArrayLength() > 0)
                        {
                            foreach (var error in variantErrors.EnumerateArray())
                            {
                                if (error.TryGetProperty("message", out var message))
                                {
                                    var errorMsg = $"Variant: {message.GetString()}";
                                    _logger.LogError("GraphQL variant error: {Error}", errorMsg);
                                    errors.Add(errorMsg);
                                }
                            }
                        }

                        // Check productUpdate errors
                        if (dataElement.TryGetProperty("productUpdate", out var productUpdate) &&
                            productUpdate.TryGetProperty("userErrors", out var productErrors) &&
                            productErrors.GetArrayLength() > 0)
                        {
                            foreach (var error in productErrors.EnumerateArray())
                            {
                                if (error.TryGetProperty("message", out var message))
                                {
                                    var errorMsg = $"Product: {message.GetString()}";
                                    _logger.LogError("GraphQL product error: {Error}", errorMsg);
                                    errors.Add(errorMsg);
                                }
                            }
                        }
                    }
                    else if (resultData.TryGetProperty("errors", out var graphqlErrors))
                    {
                        // Handle GraphQL schema-level errors
                        _logger.LogError("GraphQL schema errors for variant {VariantId}: {Errors}", variantId, graphqlErrors.ToString());
                        foreach (var error in graphqlErrors.EnumerateArray())
                        {
                            if (error.TryGetProperty("message", out var message))
                            {
                                errors.Add($"GraphQL Error: {message.GetString()}");
                            }
                        }
                    }
                    else
                    {
                        _logger.LogWarning("GraphQL response missing 'data' property for variant {VariantId}. Full response: {Response}", variantId, resultJson);
                        errors.Add("Invalid GraphQL response structure");
                    }
                }
            }

            if (errors.Any())
            {
                return BadRequest(new ShopifyApiResponseDto<object>
                {
                    Success = false,
                    Error = string.Join("; ", errors)
                });
            }

            return Ok(new ShopifyApiResponseDto<object>
            {
                Success = true,
                Message = $"Product variant {variantId} updated successfully",
                Data = new { variantId = variantId }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update product variant {VariantId}: {Error}", variantId, ex.Message);
            return StatusCode(500, new ShopifyApiResponseDto<object>
            {
                Success = false,
                Error = ex.Message
            });
        }
    }

    [HttpPost("inventory/validate-skus")]
    public async Task<IActionResult> ValidateSkus([FromBody] ValidateSkusDto request)
    {
        try
        {
            var credentials = await GetUserShopifyCredentialsAsync();
            if (credentials == null)
            {
                return BadRequest(new ShopifyApiResponseDto<SkuValidationResultDto>
                {
                    Success = false,
                    Error = ErrorMessages.NoShopifyStoreConnected
                });
            }

            _logger.LogInformation("Validating {Count} SKUs from CSV", request.CsvData.Count);

            var foundProducts = new List<FoundProductDto>();
            var notFoundSkus = new List<NotFoundSkuDto>();
            var processedSkus = new HashSet<string>(StringComparer.OrdinalIgnoreCase); // Track processed SKUs to avoid duplicates

            // Enhanced CSV processing with better sanitization
            var csvSkuMap = new Dictionary<string, string>();

            foreach (var row in request.CsvData)
            {
                var rawSku = row.Sku;
                var rawFnsku = row.Fnsku;

                if (string.IsNullOrEmpty(rawSku?.Trim()))
                    continue;

                // Advanced sanitization for CSV data
                var sanitizedSku = rawSku.Trim()
                    .Replace("\r", "")
                    .Replace("\n", "")
                    .Replace("\t", "")
                    .Replace("\"", "")
                    .Replace("'", "");

                var sanitizedFnsku = rawFnsku?.Trim()
                    .Replace("\r", "")
                    .Replace("\n", "")
                    .Replace("\t", "")
                    .Replace("\"", "")
                    .Replace("'", "") ?? "";

                var skuKey = sanitizedSku.ToLower();

                // Check for duplicates and log them
                if (csvSkuMap.ContainsKey(skuKey))
                {
                    _logger.LogWarning("⚠️ DUPLICATE SKU in CSV: '{Sku}' (keeping first occurrence)", sanitizedSku);
                }
                else
                {
                    csvSkuMap[skuKey] = sanitizedFnsku;
                }
            }

            // Extract unique SKUs from CSV data with same sanitization logic
            var skuList = csvSkuMap.Keys.ToList(); // Use sanitized keys from csvSkuMap

            // SPECIAL DEBUG for user's specific SKU case
            var targetSku = "birthday-cake-cutting-fruit-toys";
            var targetFnsku = "X0029KG7H7";
            _logger.LogWarning("🔍 DEBUGGING SPECIFIC SKU: '{TargetSku}' with FNSKU '{TargetFnsku}'", targetSku, targetFnsku);

            // Check if target SKU exists in CSV data
            var csvContainsTarget = csvSkuMap.ContainsKey(targetSku.ToLower());
            _logger.LogWarning("   - CSV contains target SKU (case-insensitive): {Contains}", csvContainsTarget);

            if (csvContainsTarget)
            {
                var csvFnskuForTarget = csvSkuMap[targetSku.ToLower()];
                _logger.LogWarning("   - CSV FNSKU for target: '{CsvFnsku}'", csvFnskuForTarget);
            }

            // Check all CSV entries for potential matches
            foreach (var csvEntry in csvSkuMap)
            {
                if (csvEntry.Key.Contains("birthday") || csvEntry.Key.Contains("cake"))
                {
                    _logger.LogWarning("   - Found potential match in CSV: SKU='{CsvSku}' → FNSKU='{CsvFnsku}'", csvEntry.Key, csvEntry.Value);
                }
            }

            // Debug: Log detailed CSV processing info
            _logger.LogInformation("CSV Processing Details:");
            _logger.LogInformation("   - Total CSV rows: {TotalRows}", request.CsvData.Count);
            _logger.LogInformation("   - Valid SKU rows: {ValidRows}", csvSkuMap.Count);
            _logger.LogInformation("   - Unique SKUs: {UniqueSkus}", skuList.Count);

            // Log first few CSV entries for debugging
            foreach (var entry in csvSkuMap.Take(5))
            {
                _logger.LogInformation("   - CSV Entry: SKU='{Sku}' → FNSKU='{Fnsku}'", entry.Key, entry.Value);
            }

            _logger.LogInformation("Processing {TotalSkus} unique SKUs from CSV: {SampleSkus}",
                skuList.Count,
                string.Join(", ", skuList.Take(5)));

            // Debug: Log all CSV SKUs for troubleshooting
            _logger.LogInformation("All CSV SKUs being searched: {AllCsvSkus}",
                string.Join(", ", skuList.Take(20))); // Log first 20 SKUs

            // OPTIMIZED APPROACH for large datasets:
            // Instead of processing SKUs in batches and fetching all products multiple times,
            // we'll fetch all products ONCE and then match against all CSV SKUs
            _logger.LogInformation("🚀 OPTIMIZED MODE: Fetching all products once for {SkuCount} SKUs", skuList.Count);

            // Single pass through all products to find matches
            var foundSkusInSearch = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            string? cursor = null;
            bool hasNextPage = true;
            int pageCount = 0;
            int totalProductsProcessed = 0;

            while (hasNextPage)
            {
                try
                {
                    pageCount++;

                    // Use GraphQL to get all products with pagination (no SKU filtering)
                    var graphqlQuery = ShopifyQueries.FindProductsBySkuQuery(new List<string>(), 250, cursor);

                    _logger.LogDebug("📄 Fetching products page {PageCount} (cursor: {Cursor})", pageCount, cursor ?? "none");

                    var result = await _shopifyApiService.ExecuteGraphQLQueryAsync<object>(credentials, graphqlQuery);

                    if (result.Success && result.Data != null)
                    {
                        // Parse GraphQL response
                        var responseJson = JsonSerializer.Serialize(result.Data);
                        var responseData = JsonSerializer.Deserialize<JsonElement>(responseJson);

                        if (responseData.TryGetProperty("data", out var dataElement) &&
                            dataElement.TryGetProperty("products", out var productsElement) &&
                            productsElement.TryGetProperty("edges", out var edgesElement))
                        {
                            var productsInThisPage = edgesElement.GetArrayLength();
                            totalProductsProcessed += productsInThisPage;

                            _logger.LogDebug("📦 Processing {ProductCount} products on page {PageCount} (total so far: {Total})",
                                productsInThisPage, pageCount, totalProductsProcessed);

                            foreach (var edge in edgesElement.EnumerateArray())
                            {
                                if (!edge.TryGetProperty("node", out var productNode))
                                    continue;

                                var productId = productNode.GetProperty("id").GetString() ?? "";
                                var productTitle = productNode.GetProperty("title").GetString() ?? "";
                                var productStatus = productNode.GetProperty("status").GetString() ?? "";

                                // Get product image
                                var imageUrl = "";
                                if (productNode.TryGetProperty("images", out var imagesNode) &&
                                    imagesNode.TryGetProperty("edges", out var imageEdges) &&
                                    imageEdges.GetArrayLength() > 0)
                                {
                                    var firstImageEdge = imageEdges[0];
                                    if (firstImageEdge.TryGetProperty("node", out var imageNode))
                                    {
                                        imageUrl = imageNode.GetProperty("url").GetString() ?? "";
                                    }
                                }

                                // Process variants
                                if (productNode.TryGetProperty("variants", out var variantsNode) &&
                                    variantsNode.TryGetProperty("edges", out var variantEdges))
                                {
                                    foreach (var variantEdge in variantEdges.EnumerateArray())
                                    {
                                        if (!variantEdge.TryGetProperty("node", out var variantNode))
                                            continue;

                                        var variantId = variantNode.GetProperty("id").GetString() ?? "";
                                        var sku = variantNode.TryGetProperty("sku", out var skuElement) ? skuElement.GetString() ?? "" : "";
                                        var currentBarcode = variantNode.TryGetProperty("barcode", out var barcodeElement) ? barcodeElement.GetString() ?? "" : "";
                                        var price = variantNode.TryGetProperty("price", out var priceElement) ? priceElement.GetString() ?? "0" : "0";

                                        // Normalize SKU and barcode for comparison
                                        var normalizedSku = sku?.Trim() ?? "";
                                        var normalizedBarcode = currentBarcode?.Trim() ?? "";

                                        // Check if this variant's SKU matches any CSV SKU (optimized: check against csvSkuMap directly)
                                        var normalizedSkuLower = normalizedSku.ToLower();

                                        // SPECIAL DEBUG for target SKU
                                        if (normalizedSku.Contains("birthday") || normalizedSku.Contains("cake") || normalizedSku == targetSku)
                                        {
                                            _logger.LogWarning("🎂 FOUND TARGET SKU IN SHOPIFY:");
                                            _logger.LogWarning("   - Shopify SKU (raw): '{RawSku}'", sku);
                                            _logger.LogWarning("   - Shopify SKU (normalized): '{NormalizedSku}'", normalizedSku);
                                            _logger.LogWarning("   - Shopify Barcode: '{Barcode}'", currentBarcode);
                                            _logger.LogWarning("   - Product: '{Product}'", productTitle);
                                            _logger.LogWarning("   - CSV contains this SKU: {Contains}", csvSkuMap.ContainsKey(normalizedSkuLower));
                                            _logger.LogWarning("   - Already processed: {Processed}", processedSkus.Contains(normalizedSkuLower));
                                        }

                                        // SIMPLIFIED LOGIC per user requirements:
                                        // Check 1: CSV SKU must match Shopify SKU (primary matching)
                                        var csvSkuMatchesShopifySku = !string.IsNullOrEmpty(normalizedSku) &&
                                                                     csvSkuMap.ContainsKey(normalizedSkuLower) &&
                                                                     !processedSkus.Contains(normalizedSkuLower);

                                        var matchedSku = "";
                                        var matchType = "";

                                        // Only process if CSV SKU matches Shopify SKU
                                        if (csvSkuMatchesShopifySku)
                                        {
                                            matchedSku = normalizedSkuLower; // Use lowercase version for consistency
                                            matchType = "CSV SKU matches Shopify SKU";
                                        }

                                        if (!string.IsNullOrEmpty(matchedSku))
                                        {
                                            foundSkusInSearch.Add(matchedSku);
                                            processedSkus.Add(matchedSku); // Mark as processed to avoid duplicates
                                            var newBarcode = csvSkuMap[matchedSku]; // Already lowercase

                                            _logger.LogDebug("✅ SKU Match Found: CSV '{CsvSku}' matches Shopify '{ShopifySku}' ({MatchType}) for product '{ProductTitle}'",
                                                matchedSku, normalizedSku, matchType, productTitle);

                                            // USER'S LOGIC: Only show products that need barcode updates
                                            // Check 2: If CSV SKU == Shopify SKU AND Shopify Barcode != CSV FNSKU → Show in found list
                                            // Check 3: If CSV SKU == Shopify SKU AND Shopify Barcode == CSV FNSKU → Don't show (already correct)
                                            var currentBarcodeNormalized = (currentBarcode ?? "").Trim();
                                            var csvFnskuNormalized = (newBarcode ?? "").Trim();

                                            var needsUpdate = !currentBarcodeNormalized.Equals(csvFnskuNormalized, StringComparison.OrdinalIgnoreCase);

                                            _logger.LogDebug("Barcode comparison: Current='{Current}' vs CSV_FNSKU='{CsvFnsku}' → NeedsUpdate={NeedsUpdate}",
                                                currentBarcodeNormalized, csvFnskuNormalized, needsUpdate);

                                            if (needsUpdate)
                                            {
                                                foundProducts.Add(new FoundProductDto
                                                {
                                                    ProductId = productId,
                                                    VariantId = variantId,
                                                    ProductTitle = productTitle ?? string.Empty,
                                                    Sku = normalizedSku ?? string.Empty, // Keep the actual Shopify SKU field
                                                    CurrentBarcode = currentBarcode ?? string.Empty,
                                                    NewBarcode = newBarcode ?? string.Empty,
                                                    Status = productStatus ?? string.Empty,
                                                    Price = price,
                                                    ImageUrl = imageUrl ?? string.Empty
                                                });

                                                _logger.LogDebug("Added product for update: {ProductTitle} (Shopify SKU: {ShopifySku}, matched via {MatchType})",
                                                    productTitle, normalizedSku, matchType);
                                            }
                                            else
                                            {
                                                _logger.LogDebug("⚪ Skipping product '{ProductTitle}' - already correct (Shopify barcode '{Current}' matches CSV FNSKU '{CsvFnsku}')",
                                                    productTitle, currentBarcodeNormalized, csvFnskuNormalized);
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // Check pagination info for next page
                        if (dataElement.TryGetProperty("products", out var productsForPagination) &&
                            productsForPagination.TryGetProperty("pageInfo", out var pageInfo))
                        {
                            hasNextPage = pageInfo.TryGetProperty("hasNextPage", out var hasNext) && hasNext.GetBoolean();
                            if (hasNextPage && pageInfo.TryGetProperty("endCursor", out var endCursor))
                            {
                                cursor = endCursor.GetString();
                            }
                        }
                        else
                        {
                            hasNextPage = false;
                        }
                    }
                    else
                    {
                        _logger.LogError("GraphQL query failed: {Error}", result.Error ?? "Unknown error");
                        hasNextPage = false;
                    }

                    // Add small delay between pagination requests
                    if (hasNextPage)
                    {
                        await Task.Delay(200);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to fetch products on page {PageCount}: {Error}", pageCount, ex.Message);
                    hasNextPage = false;
                }
            }

            _logger.LogInformation("🔍 SEARCH COMPLETE: Processed {TotalProducts} products across {PageCount} pages. Found {FoundCount} matching SKUs.",
                totalProductsProcessed, pageCount, foundSkusInSearch.Count);

            // After processing all products, identify not found SKUs
            foreach (var csvSkuLower in skuList)
            {
                if (!foundSkusInSearch.Contains(csvSkuLower, StringComparer.OrdinalIgnoreCase))
                {
                    // Get original SKU format for display (find original case from csvSkuMap)
                    var originalSku = csvSkuMap.FirstOrDefault(kvp => kvp.Key == csvSkuLower).Key ?? csvSkuLower;

                    _logger.LogWarning("❌ SKU Not Found: '{NotFoundSku}' was not found in {TotalProducts} Shopify products", originalSku, totalProductsProcessed);

                    notFoundSkus.Add(new NotFoundSkuDto
                    {
                        Sku = originalSku,
                        Fnsku = csvSkuMap.ContainsKey(csvSkuLower) ? csvSkuMap[csvSkuLower] : "",
                        Reason = "SKU not found in Shopify store after searching all products"
                    });
                }
            }

            // Calculate unique SKUs found vs not found
            var uniqueSkusInCsv = skuList.Count;
            var foundUniqueSkus = foundProducts.Count; // Now deduplicated
            var notFoundUniqueSkus = notFoundSkus.Count;
            var alreadyUpToDateSkus = uniqueSkusInCsv - foundUniqueSkus - notFoundUniqueSkus;

            _logger.LogInformation("SKU Validation Results: CSV had {CsvTotal} rows with {UniqueSkus} unique SKUs. " +
                                 "Found {Found} SKUs needing updates, {NotFound} SKUs not found in Shopify, " +
                                 "{AlreadyUpToDate} SKUs already up-to-date.",
                                 request.CsvData.Count, uniqueSkusInCsv, foundUniqueSkus, notFoundUniqueSkus, alreadyUpToDateSkus);

            // Debug: Log detailed not found results
            if (notFoundSkus.Any())
            {
                _logger.LogWarning("❌ NOT FOUND SKUs Details:");
                foreach (var notFound in notFoundSkus.Take(10)) // Log first 10 not found
                {
                    _logger.LogWarning("   - SKU: '{Sku}' | FNSKU: '{Fnsku}' | Reason: {Reason}",
                        notFound.Sku, notFound.Fnsku, notFound.Reason);
                }
                if (notFoundSkus.Count > 10)
                {
                    _logger.LogWarning("   ... and {More} more not found SKUs", notFoundSkus.Count - 10);
                }
            }

            var summary = $"Found {foundUniqueSkus} SKUs needing barcode updates, {notFoundUniqueSkus} SKUs not found in Shopify";
            if (alreadyUpToDateSkus > 0)
            {
                summary += $", {alreadyUpToDateSkus} SKUs already up-to-date";
            }
            summary += $" out of {uniqueSkusInCsv} unique SKUs from CSV";

            return Ok(new ShopifyApiResponseDto<SkuValidationResultDto>
            {
                Success = true,
                Data = new SkuValidationResultDto
                {
                    FoundProducts = foundProducts,
                    NotFoundSkus = notFoundSkus,
                    TotalCsvRows = request.CsvData.Count,
                    FoundCount = foundUniqueSkus,
                    NotFoundCount = notFoundUniqueSkus,
                    Summary = summary
                },
                Message = summary
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to validate SKUs: {Error}", ex.Message);
            return StatusCode(500, new ShopifyApiResponseDto<SkuValidationResultDto>
            {
                Success = false,
                Error = ex.Message
            });
        }
    }

    [HttpPut("inventory/bulk-update")]
    public async Task<IActionResult> BulkUpdateProductVariants([FromBody] BulkUpdateProductVariantsDto request)
    {
        try
        {
            var credentials = await GetUserShopifyCredentialsAsync();
            if (credentials == null)
            {
                return BadRequest(new ShopifyApiResponseDto<BulkUpdateResultDto>
                {
                    Success = false,
                    Error = ErrorMessages.NoShopifyStoreConnected
                });
            }

            _logger.LogInformation("Bulk updating {Count} product variants", request.Updates.Count);

            var results = new List<ProductVariantUpdateResultDto>();
            var successful = 0;
            var failed = 0;

            // Process updates in batches to avoid overwhelming the API
            const int batchSize = 10;
            var batches = request.Updates
                .Select((item, index) => new { item, index })
                .GroupBy(x => x.index / batchSize)
                .Select(g => g.Select(x => x.item).ToList())
                .ToList();

            foreach (var batch in batches)
            {
                var batchTasks = batch.Select(async update =>
                {
                    try
                    {
                        var updateTasks = new List<Task<ShopifyApiResponse<object>>>();

                        // Update variant properties
                        if (!string.IsNullOrEmpty(update.Sku) || !string.IsNullOrEmpty(update.Barcode) ||
                            update.Price.HasValue || update.CompareAtPrice.HasValue)
                        {
                            var variantMutation = ShopifyQueries.UpdateProductVariantMutation(
                                update.ProductId, update.VariantId, update.Sku, update.Barcode, update.Price, update.CompareAtPrice);

                            updateTasks.Add(_shopifyApiService.ExecuteGraphQLQueryAsync<object>(credentials, variantMutation));
                        }

                        // Update product properties
                        if (!string.IsNullOrEmpty(update.Title) || !string.IsNullOrEmpty(update.Status))
                        {
                            var productMutation = ShopifyQueries.UpdateProductMutation(
                                update.ProductId, update.Title, update.Status);

                            updateTasks.Add(_shopifyApiService.ExecuteGraphQLQueryAsync<object>(credentials, productMutation));
                        }

                        if (updateTasks.Any())
                        {
                            var updateResults = await Task.WhenAll(updateTasks);
                            var errors = new List<string>();

                            foreach (var result in updateResults)
                            {
                                if (!result.Success)
                                {
                                    errors.Add(result.Error ?? "Unknown error");
                                }
                                else if (result.Data != null)
                                {
                                    // Check for GraphQL user errors
                                    var resultJson = JsonSerializer.Serialize(result.Data);
                                    var resultData = JsonSerializer.Deserialize<JsonElement>(resultJson);

                                    if (resultData.TryGetProperty("data", out var dataElement))
                                    {
                                        if (dataElement.TryGetProperty("productVariantsBulkUpdate", out var variantBulkUpdate) &&
                                            variantBulkUpdate.TryGetProperty("userErrors", out var variantErrors) &&
                                            variantErrors.GetArrayLength() > 0)
                                        {
                                            foreach (var error in variantErrors.EnumerateArray())
                                            {
                                                if (error.TryGetProperty("message", out var message))
                                                {
                                                    errors.Add(message.GetString() ?? "Unknown variant error");
                                                }
                                            }
                                        }

                                        if (dataElement.TryGetProperty("productUpdate", out var productUpdate) &&
                                            productUpdate.TryGetProperty("userErrors", out var productErrors) &&
                                            productErrors.GetArrayLength() > 0)
                                        {
                                            foreach (var error in productErrors.EnumerateArray())
                                            {
                                                if (error.TryGetProperty("message", out var message))
                                                {
                                                    errors.Add(message.GetString() ?? "Unknown product error");
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            if (errors.Any())
                            {
                                return new ProductVariantUpdateResultDto
                                {
                                    Success = false,
                                    VariantId = update.VariantId,
                                    Error = string.Join("; ", errors),
                                    ProductInfo = $"Product {update.ProductId}, Variant {update.VariantId}"
                                };
                            }
                        }

                        return new ProductVariantUpdateResultDto
                        {
                            Success = true,
                            VariantId = update.VariantId,
                            ProductInfo = $"Product {update.ProductId}, Variant {update.VariantId}"
                        };
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to update variant {VariantId} in bulk update", update.VariantId);
                        return new ProductVariantUpdateResultDto
                        {
                            Success = false,
                            VariantId = update.VariantId,
                            Error = ex.Message,
                            ProductInfo = $"Product {update.ProductId}, Variant {update.VariantId}"
                        };
                    }
                });

                var batchResults = await Task.WhenAll(batchTasks);
                results.AddRange(batchResults);

                // Add a small delay between batches to be respectful to the API
                if (batches.IndexOf(batch) < batches.Count - 1)
                {
                    await Task.Delay(100);
                }
            }

            successful = results.Count(r => r.Success);
            failed = results.Count(r => !r.Success);

            var summary = $"Bulk update completed: {successful} successful, {failed} failed out of {request.Updates.Count} total";

            return Ok(new ShopifyApiResponseDto<BulkUpdateResultDto>
            {
                Success = true,
                Data = new BulkUpdateResultDto
                {
                    Successful = successful,
                    Failed = failed,
                    Results = results,
                    Errors = results.Where(r => !r.Success).Select(r => r.Error ?? "Unknown error").ToList(),
                    Summary = summary
                },
                Message = summary
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to bulk update product variants: {Error}", ex.Message);
            return StatusCode(500, new ShopifyApiResponseDto<BulkUpdateResultDto>
            {
                Success = false,
                Error = ex.Message
            });
        }
    }



    [HttpPost("inventory/export-not-found-csv")]
    public IActionResult ExportNotFoundSkusCsv([FromBody] ExportNotFoundSkusDto request)
    {
        try
        {
            if (!request.NotFoundSkus.Any())
            {
                return BadRequest(new ShopifyApiResponseDto<object>
                {
                    Success = false,
                    Error = "No SKUs provided for export"
                });
            }

            var csvBuilder = new StringBuilder();

            // Add header
            csvBuilder.AppendLine("SKU,FNSKU (Barcode),Reason Not Found");

            // Add data rows
            foreach (var sku in request.NotFoundSkus)
            {
                var line = $"\"{EscapeCsvField(sku.Sku)}\",\"{EscapeCsvField(sku.Fnsku)}\",\"{EscapeCsvField(sku.Reason)}\"";
                csvBuilder.AppendLine(line);
            }

            var csvContent = csvBuilder.ToString();
            var fileName = $"NotFoundSKUs_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv";

            _logger.LogInformation("Exporting {Count} not found SKUs to CSV", request.NotFoundSkus.Count);

            return File(
                Encoding.UTF8.GetBytes(csvContent),
                "text/csv",
                fileName
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to export not found SKUs to CSV: {Error}", ex.Message);
            return StatusCode(500, new ShopifyApiResponseDto<object>
            {
                Success = false,
                Error = ex.Message
            });
        }
    }

    [HttpPost("inventory/export-not-found-pdf")]
    public IActionResult ExportNotFoundSkusPdf([FromBody] ExportNotFoundSkusDto request)
    {
        try
        {
            if (!request.NotFoundSkus.Any())
            {
                return BadRequest(new ShopifyApiResponseDto<object>
                {
                    Success = false,
                    Error = "No SKUs provided for export"
                });
            }

            // Set QuestPDF license (free for open source/personal use)
            QuestPDF.Settings.License = LicenseType.Community;

            var pdfBytes = GenerateNotFoundSkusPdf(request);
            var fileName = $"NotFoundSKUs_{DateTime.UtcNow:yyyyMMdd_HHmmss}.pdf";

            _logger.LogInformation("Exporting {Count} not found SKUs to PDF", request.NotFoundSkus.Count);

            return File(pdfBytes, "application/pdf", fileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to export not found SKUs to PDF: {Error}", ex.Message);
            return StatusCode(500, new ShopifyApiResponseDto<object>
            {
                Success = false,
                Error = ex.Message
            });
        }
    }

    private byte[] GenerateNotFoundSkusPdf(ExportNotFoundSkusDto request)
    {
        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(2, Unit.Centimetre);

                page.Header()
                    .Text($"{request.Title}")
                    .SemiBold().FontSize(20).FontColor(Colors.Blue.Medium);

                page.Content()
                    .PaddingVertical(1, Unit.Centimetre)
                    .Column(column =>
                    {
                        // Report info
                        column.Item().Row(row =>
                        {
                            row.RelativeItem().Column(col =>
                            {
                                if (!string.IsNullOrEmpty(request.StoreName))
                                {
                                    col.Item().Text($"Store: {request.StoreName}").FontSize(12);
                                }
                                col.Item().Text($"Generated: {request.GeneratedAt:yyyy-MM-dd HH:mm:ss} UTC").FontSize(12);
                                col.Item().Text($"Total Not Found SKUs: {request.NotFoundSkus.Count}").FontSize(12).SemiBold();
                            });
                        });

                        column.Item().PaddingTop(20).LineHorizontal(1).LineColor(Colors.Grey.Lighten2);

                        // Table
                        column.Item().PaddingTop(20).Table(table =>
                        {
                            // Define columns
                            table.ColumnsDefinition(columns =>
                            {
                                columns.RelativeColumn(3); // SKU
                                columns.RelativeColumn(3); // FNSKU
                                columns.RelativeColumn(4); // Reason
                            });

                            // Header
                            table.Header(header =>
                            {
                                header.Cell().Element(CellStyle).Text("SKU").FontColor(Colors.White);
                                header.Cell().Element(CellStyle).Text("FNSKU (Barcode)").FontColor(Colors.White);
                                header.Cell().Element(CellStyle).Text("Reason Not Found").FontColor(Colors.White);

                                static IContainer CellStyle(IContainer container)
                                {
                                    return container
                                        .DefaultTextStyle(x => x.SemiBold())
                                        .PaddingVertical(5)
                                        .PaddingHorizontal(10)
                                        .Background(Colors.Blue.Medium);
                                }
                            });

                            // Data rows
                            foreach (var sku in request.NotFoundSkus)
                            {
                                table.Cell().Element(CellStyle).Text(sku.Sku ?? "");
                                table.Cell().Element(CellStyle).Text(sku.Fnsku ?? "");
                                table.Cell().Element(CellStyle).Text(sku.Reason ?? "");

                                static IContainer CellStyle(IContainer container)
                                {
                                    return container
                                        .BorderBottom(1)
                                        .BorderColor(Colors.Grey.Lighten2)
                                        .PaddingVertical(5)
                                        .PaddingHorizontal(10);
                                }
                            }
                        });
                    });

                page.Footer()
                    .AlignCenter()
                    .Text(x =>
                    {
                        x.Span("Page ");
                        x.CurrentPageNumber();
                        x.Span(" of ");
                        x.TotalPages();
                    });
            });
        }).GeneratePdf();
    }

    private static string EscapeCsvField(string? field)
    {
        if (string.IsNullOrEmpty(field))
            return "";

        // Escape quotes by doubling them
        return field.Replace("\"", "\"\"");
    }

    private async Task<ShopifyCredentials?> GetUserShopifyCredentialsAsync()
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                _logger.LogWarning("User ID not found in authentication token");
                return null;
            }

            var storeConnection = await _storeConnectionService.GetDefaultStoreConnectionAsync(userId.Value, "shopify");
            if (storeConnection == null)
            {
                _logger.LogWarning("No Shopify store connection found for user {UserId}", userId.Value);
                return null;
            }

            // Decrypt credentials from the store connection
            var credentials = await _storeConnectionService.GetDecryptedCredentialsAsync(storeConnection.Id);
            if (credentials == null || !credentials.ContainsKey("accessToken"))
            {
                _logger.LogWarning("No access token found in store connection {StoreId}", storeConnection.Id);
                return null;
            }

            // Update last used timestamp
            await _storeConnectionService.UpdateLastUsedAsync(storeConnection.Id);

            return new ShopifyCredentials
            {
                Store = storeConnection.StoreName,
                AccessToken = credentials["accessToken"]
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, ErrorMessages.DatabaseQueryFailed);
            return null;
        }
    }

    private Guid? GetCurrentUserId()
    {
        try
        {
            var userIdClaim = User.FindFirst("UserId") ?? User.FindFirst("sub") ?? User.FindFirst("user_id");
            if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return userId;
            }

            var emailClaim = User.FindFirst("email") ?? User.FindFirst("Email");
            if (emailClaim != null)
            {
                _logger.LogWarning("User ID not found in token for email: {Email}", emailClaim.Value);
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, LogMessages.InvalidTokenProvided);
            return null;
        }
    }

    // Modern Cursor-based pagination endpoint - Used by Facebook, Instagram, Twitter
    [HttpGet("products/cursor")]
    public async Task<IActionResult> GetProductsCursor(
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] string? cursor = null,
        [FromQuery] int limit = 50)
    {
        try
        {
            var credentials = await GetUserShopifyCredentialsAsync();
            if (credentials == null)
            {
                return BadRequest(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = ErrorMessages.NoShopifyStoreConnectionFound
                });
            }

            // Get store connection ID
            var storeConnection = await _storeConnectionService.GetDefaultStoreConnectionAsync(GetCurrentUserId() ?? Guid.Empty, "shopify");
            if (storeConnection == null)
            {
                return BadRequest(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = "Store connection not found"
                });
            }

            var syncService = HttpContext.RequestServices.GetRequiredService<IShopifyProductSyncService>();

            // Auto-sync if no local products
            if (!await syncService.HasLocalProductsAsync(storeConnection.Id))
            {
                _logger.LogInformation("No local products found for store {StoreConnectionId}, initiating sync", storeConnection.Id);

                var syncResult = await syncService.SyncProductsAsync(storeConnection.Id, false);
                if (!syncResult.Success)
                {
                    return StatusCode(500, new ShopifyApiResponse<object>
                    {
                        Success = false,
                        Error = $"Failed to sync products: {syncResult.Error}"
                    });
                }
            }

            // Use cursor-based pagination
            var result = await syncService.GetLocalProductsWithCursorAsync(storeConnection.Id, search, status, cursor, limit);

            // Convert to response format
            var products = result.Products.Select(p => new
            {
                id = p.ShopifyProductId,
                title = p.Title,
                handle = p.Handle,
                bodyHtml = p.BodyHtml,
                vendor = p.Vendor,
                productType = p.ProductType,
                createdAt = p.ShopifyCreatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                updatedAt = p.ShopifyUpdatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                publishedAt = p.ShopifyPublishedAt?.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                status = p.Status,
                tags = p.Tags?.Split(',').Where(t => !string.IsNullOrEmpty(t.Trim())).ToArray() ?? new string[0],
                variants = p.Variants.Select(v => new
                {
                    id = v.ShopifyVariantId,
                    title = v.Title,
                    price = v.Price.ToString("F2"),
                    compareAtPrice = v.CompareAtPrice?.ToString("F2"),
                    sku = v.Sku,
                    barcode = v.Barcode,
                    inventoryQuantity = v.InventoryQuantity
                }).ToArray(),
                images = string.IsNullOrEmpty(p.ImageUrl) ? new object[0] : new[]
                {
                    new
                    {
                        id = "local-image-1",
                        url = p.ImageUrl,
                        altText = p.ImageAltText,
                        width = p.ImageWidth,
                        height = p.ImageHeight
                    }
                }
            }).ToList();

            var responseData = new
            {
                products = products,
                pageInfo = new
                {
                    hasNextPage = result.HasMore,
                    nextCursor = result.NextCursor
                }
            };

            var metadata = new Dictionary<string, object>
            {
                ["count"] = products.Count,
                ["hasMore"] = result.HasMore,
                ["nextCursor"] = result.NextCursor ?? "",
                ["searchQuery"] = search ?? "",
                ["statusFilter"] = status ?? "",
                ["currentCursor"] = cursor ?? "",
                ["paginationMethod"] = "keyset_cursor",
                ["requestTime"] = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                ["source"] = "keyset_pagination"
            };

            return Ok(new ShopifyApiResponse<object>
            {
                Success = true,
                Data = responseData,
                Message = $"Successfully fetched {products.Count} products using cursor pagination",
                Metadata = metadata
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in cursor-based product pagination");
            return StatusCode(500, new ShopifyApiResponse<object>
            {
                Success = false,
                Error = ex.Message
            });
        }
    }

    // TEST: Check inventory levels in database
    [HttpGet("inventory/levels/test")]
    public async Task<IActionResult> TestInventoryLevels()
    {
        try
        {
            // Get store connection
            var storeConnection = await _storeConnectionService.GetDefaultStoreConnectionAsync(GetCurrentUserId() ?? Guid.Empty, "shopify");
            if (storeConnection == null)
            {
                return BadRequest(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = "Store connection not found"
                });
            }

            // Count total inventory levels
            var totalInventoryLevels = await HttpContext.RequestServices.GetRequiredService<ApplicationDbContext>()
                .ShopifyInventoryLevels
                .Where(il => il.Variant.Product.StoreConnectionId == storeConnection.Id)
                .CountAsync();

            // Get sample inventory levels
            var sampleInventoryLevels = await HttpContext.RequestServices.GetRequiredService<ApplicationDbContext>()
                .ShopifyInventoryLevels
                .Where(il => il.Variant.Product.StoreConnectionId == storeConnection.Id)
                .Include(il => il.Variant)
                .Take(10)
                .Select(il => new
                {
                    il.Id,
                    il.LocationId,
                    il.LocationName,
                    il.Available,
                    il.InventoryItemId,
                    VariantSku = il.Variant.Sku,
                    VariantShopifyId = il.Variant.ShopifyVariantId
                })
                .ToListAsync();

            return Ok(new ShopifyApiResponse<object>
            {
                Success = true,
                Data = new
                {
                    totalInventoryLevels,
                    sampleInventoryLevels
                },
                Message = $"Found {totalInventoryLevels} inventory levels in database"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to test inventory levels");
            return StatusCode(500, new ShopifyApiResponse<object>
            {
                Success = false,
                Error = ex.Message
            });
        }
    }



    [HttpPost("costs/fetch")]
    public async Task<IActionResult> StartCostFetching()
    {
        try
        {
            var storeConnection = await _storeConnectionService.GetDefaultStoreConnectionAsync(GetCurrentUserId() ?? Guid.Empty, "shopify");
            if (storeConnection == null)
            {
                return BadRequest(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = "Store connection not found"
                });
            }

            var costFetchingService = HttpContext.RequestServices.GetRequiredService<ICostFetchingService>();
            
            // Start cost fetching in background
            var result = await costFetchingService.FetchCostsForStoreAsync(storeConnection.Id);

            return Ok(new ShopifyApiResponse<object>
            {
                Success = result.Success,
                Data = new
                {
                    jobId = result.JobId,
                    message = result.Success ? "Cost fetching started successfully" : "Failed to start cost fetching",
                    totalVariants = result.TotalVariants,
                    duration = result.Duration.TotalSeconds
                },
                Message = result.Success ? "Cost fetching job started" : result.Error
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting cost fetching");
            return StatusCode(500, new ShopifyApiResponse<object>
            {
                Success = false,
                Error = ex.Message
            });
        }
    }

    [HttpGet("costs/progress/{jobId}")]
    public async Task<IActionResult> GetCostFetchingProgress(string jobId)
    {
        try
        {
            var costFetchingService = HttpContext.RequestServices.GetRequiredService<ICostFetchingService>();
            var progress = await costFetchingService.GetProgressAsync(jobId);

            return Ok(new ShopifyApiResponse<object>
            {
                Success = true,
                Data = new
                {
                    jobId = progress.JobId,
                    status = progress.Status,
                    current = progress.Current,
                    total = progress.Total,
                    updated = progress.Updated,
                    failed = progress.Failed,
                    percentage = progress.Percentage,
                    currentItem = progress.CurrentItem,
                    startTime = progress.StartTime,
                    endTime = progress.EndTime,
                    duration = progress.Duration?.TotalSeconds,
                    error = progress.Error
                },
                Message = $"Progress for job {jobId}"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting cost fetching progress for job {JobId}", jobId);
            return StatusCode(500, new ShopifyApiResponse<object>
            {
                Success = false,
                Error = ex.Message
            });
        }
    }

    [HttpPost("costs/cancel/{jobId}")]
    public async Task<IActionResult> CancelCostFetching(string jobId)
    {
        try
        {
            var costFetchingService = HttpContext.RequestServices.GetRequiredService<ICostFetchingService>();
            var cancelled = await costFetchingService.CancelJobAsync(jobId);

            return Ok(new ShopifyApiResponse<object>
            {
                Success = cancelled,
                Data = new
                {
                    jobId = jobId,
                    cancelled = cancelled
                },
                Message = cancelled ? "Job cancelled successfully" : "Job not found or already completed"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cancelling cost fetching job {JobId}", jobId);
            return StatusCode(500, new ShopifyApiResponse<object>
            {
                Success = false,
                Error = ex.Message
            });
        }
    }

    [HttpGet("costs/stats")]
    public async Task<IActionResult> GetCostStats()
    {
        try
        {
            var storeConnection = await _storeConnectionService.GetDefaultStoreConnectionAsync(GetCurrentUserId() ?? Guid.Empty, "shopify");
            if (storeConnection == null)
            {
                return BadRequest(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = "Store connection not found"
                });
            }

            // Get cost statistics
            var totalVariants = await _context.ShopifyProductVariants
                .Include(v => v.Product)
                .Where(v => v.Product.StoreConnectionId == storeConnection.Id)
                .CountAsync();

            var variantsWithCost = await _context.ShopifyProductVariants
                .Include(v => v.Product)
                .Where(v => v.Product.StoreConnectionId == storeConnection.Id && v.CostPerItem != null)
                .CountAsync();

            var variantsWithoutCost = totalVariants - variantsWithCost;
            var costPercentage = totalVariants > 0 ? (double)variantsWithCost / totalVariants * 100 : 0;

            return Ok(new ShopifyApiResponse<object>
            {
                Success = true,
                Data = new
                {
                    totalVariants = totalVariants,
                    variantsWithCost = variantsWithCost,
                    variantsWithoutCost = variantsWithoutCost,
                    costPercentage = Math.Round(costPercentage, 2)
                },
                Message = "Cost statistics retrieved successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting cost statistics");
            return StatusCode(500, new ShopifyApiResponse<object>
            {
                Success = false,
                Error = ex.Message
            });
        }
    }

    [HttpGet("dashboard/analytics")]
    public async Task<IActionResult> GetDashboardAnalytics()
    {
        try
        {
            var storeConnection = await _storeConnectionService.GetDefaultStoreConnectionAsync(GetCurrentUserId() ?? Guid.Empty, "shopify");
            if (storeConnection == null)
            {
                return BadRequest(new ShopifyApiResponse<object>
                {
                    Success = false,
                    Error = "Store connection not found"
                });
            }

            // Get product count
            var productCount = await _context.ShopifyProducts
                .Where(p => p.StoreConnectionId == storeConnection.Id)
                .CountAsync();

            // Get total variants
            var totalVariants = await _context.ShopifyProductVariants
                .Include(v => v.Product)
                .Where(v => v.Product.StoreConnectionId == storeConnection.Id)
                .CountAsync();

            // Get variants with cost data
            var variantsWithCost = await _context.ShopifyProductVariants
                .Include(v => v.Product)
                .Where(v => v.Product.StoreConnectionId == storeConnection.Id && v.CostPerItem != null)
                .CountAsync();

            var variantsWithoutCost = totalVariants - variantsWithCost;
            var costPercentage = totalVariants > 0 ? (double)variantsWithCost / totalVariants * 100 : 0;

            // Calculate cost metrics
            var variantsWithCostData = await _context.ShopifyProductVariants
                .Include(v => v.Product)
                .Where(v => v.Product.StoreConnectionId == storeConnection.Id && v.CostPerItem != null)
                .Select(v => new
                {
                    v.CostPerItem,
                    v.Price,
                    v.CompareAtPrice,
                    v.InventoryQuantity
                })
                .ToListAsync();

            decimal totalCostMaxValue = 0;
            decimal totalCostPerItem = 0;
            decimal totalCostPrice = 0;
            decimal totalPrice = 0;
            decimal totalCost = 0;

            foreach (var variant in variantsWithCostData)
            {
                var quantity = variant.InventoryQuantity;
                var maxValue = variant.CompareAtPrice ?? variant.Price;
                var costPerItem = variant.CostPerItem ?? 0;
                var price = variant.Price;

                totalCostMaxValue += maxValue * quantity;
                totalCostPerItem += costPerItem * quantity;
                totalCostPrice += price * quantity;
                totalPrice += price * quantity;
                totalCost += costPerItem * quantity;
            }

            var averagePrice = variantsWithCostData.Count > 0 ? totalPrice / variantsWithCostData.Count : 0;
            var averageCost = variantsWithCostData.Count > 0 ? totalCost / variantsWithCostData.Count : 0;
            var profitMargin = totalPrice > 0 ? ((totalPrice - totalCost) / totalPrice) * 100 : 0;

            return Ok(new ShopifyApiResponse<object>
            {
                Success = true,
                Data = new
                {
                    productCount = productCount,
                    totalProducts = productCount,
                    totalCostMaxValue = Math.Round(totalCostMaxValue, 2),
                    totalCostPerItem = Math.Round(totalCostPerItem, 2),
                    totalCostPrice = Math.Round(totalCostPrice, 2),
                    variantsWithCost = variantsWithCost,
                    variantsWithoutCost = variantsWithoutCost,
                    costPercentage = Math.Round(costPercentage, 2),
                    averagePrice = Math.Round(averagePrice, 2),
                    averageCost = Math.Round(averageCost, 2),
                    profitMargin = Math.Round(profitMargin, 2)
                },
                Message = "Analytics data retrieved successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting dashboard analytics");
            return StatusCode(500, new ShopifyApiResponse<object>
            {
                Success = false,
                Error = ex.Message
            });
        }
    }

    /// <summary>
    /// Fast product search for Amazon Labels tool - uses local database for instant results
    /// </summary>
    [HttpGet("products/search-fast")]
    [AllowAnonymous] // Allow anonymous access for tool usage
    public async Task<IActionResult> SearchProductsFast(
        [FromQuery] string? search = null,
        [FromQuery] int limit = 20)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(search) || search.Length < 2)
            {
                return Ok(new ShopifyApiResponse<object>
                {
                    Success = true,
                    Data = new { products = new object[0] },
                    Message = "Search query too short"
                });
            }

            _logger.LogInformation("Searching for products with term: {SearchTerm}", search);
            
            // Simple direct search without complex filtering
            var products = await _context.ShopifyProducts
                .Include(p => p.Variants)
                .Where(p => p.Title.ToLower().Contains(search.ToLower()))
                .Take(limit)
                .Select(p => new
                {
                    id = p.ShopifyProductId,
                    title = p.Title,
                    vendor = p.Vendor,
                    productType = p.ProductType,
                    status = p.Status,
                    variants = p.Variants.Select(v => new
                    {
                        id = v.ShopifyVariantId,
                        sku = v.Sku,
                        price = v.Price,
                        barcode = v.Barcode,
                        inventoryQuantity = v.InventoryQuantity
                    }).ToList()
                })
                .ToListAsync();
            
            _logger.LogInformation("Found {ProductCount} products matching search criteria", products.Count);

            return Ok(new ShopifyApiResponse<object>
            {
                Success = true,
                Data = new { products = products },
                Message = $"Found {products.Count} products matching '{search}'"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in fast product search: {Message}", ex.Message);
            return StatusCode(500, new ShopifyApiResponse<object>
            {
                Success = false,
                Error = "Failed to search products"
            });
        }
    }
}

