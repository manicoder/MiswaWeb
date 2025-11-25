using Microsoft.EntityFrameworkCore;
using Mlt.Admin.Api.Data;
using Mlt.Admin.Api.Models;
using Mlt.Admin.Api.Models.DTOs;
using Mlt.Admin.Api.Models.Shopify;
using Mlt.Admin.Api.Services;
using Mlt.Admin.Api.GraphQL;
using System.Text.Json;

namespace Mlt.Admin.Api.Services;

public class WarehouseShipmentService : IWarehouseShipmentService
{
    private readonly ApplicationDbContext _context;
    private readonly IShopifyApiService _shopifyApiService;
    private readonly IStoreConnectionService _storeConnectionService;
    private readonly IEncryptionService _encryptionService;
    private readonly ILogger<WarehouseShipmentService> _logger;

    public WarehouseShipmentService(
        ApplicationDbContext context,
        IShopifyApiService shopifyApiService,
        IStoreConnectionService storeConnectionService,
        IEncryptionService encryptionService,
        ILogger<WarehouseShipmentService> logger)
    {
        _context = context;
        _shopifyApiService = shopifyApiService;
        _storeConnectionService = storeConnectionService;
        _encryptionService = encryptionService;
        _logger = logger;
    }

    // Raw SQL mapping types for stored procedure results
    private sealed class WarehouseShipmentHeaderRow
    {
        public int Id { get; set; }
        public string ShipmentNumber { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? DispatchedAt { get; set; }
        public DateTime? ReceivedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string CreatedBy { get; set; } = string.Empty;
        public string? DispatchedBy { get; set; }
        public string? ReceivedBy { get; set; }
    }

    private sealed class WarehouseShipmentItemRow
    {
        public int Id { get; set; }
        public int ShipmentId { get; set; }
        public string ProductBarcode { get; set; } = string.Empty;
        public string ShopifyProductId { get; set; } = string.Empty;
        public string ShopifyVariantId { get; set; } = string.Empty;
        public string ProductTitle { get; set; } = string.Empty;
        public string? VariantTitle { get; set; }
        public string? Sku { get; set; }
        public int QuantityPlanned { get; set; }
        public int QuantityDispatched { get; set; }
        public int QuantityReceived { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal? CompareAtPrice { get; set; }
        public string Currency { get; set; } = "INR";
        public string? ProductImageUrl { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public async Task<WarehouseShipmentDto> CreateShipmentAsync(CreateWarehouseShipmentDto createDto, string userId)
    {
        try
        {
            var shipmentNumber = await GenerateShipmentNumberAsync();
            
            var shipment = new WarehouseShipment
            {
                ShipmentNumber = shipmentNumber,
                Status = "draft",
                Notes = createDto.Notes,
                CreatedBy = userId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.WarehouseShipments.Add(shipment);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created new warehouse shipment {ShipmentNumber} by user {UserId}", 
                shipmentNumber, userId);

            return MapToDto(shipment);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating warehouse shipment for user {UserId}", userId);
            throw;
        }
    }

    public async Task<WarehouseShipmentDto> CreateWarehouseTransferAsync(
        int sourceWarehouseId, 
        int destinationWarehouseId, 
        string? notes, 
        string userId)
    {
        try
        {
            // Validate warehouses exist and are different
            if (sourceWarehouseId == destinationWarehouseId)
            {
                throw new ArgumentException("Source and destination warehouses cannot be the same");
            }

            var sourceWarehouse = await _context.Warehouses.FindAsync(sourceWarehouseId);
            var destinationWarehouse = await _context.Warehouses.FindAsync(destinationWarehouseId);

            if (sourceWarehouse == null)
            {
                throw new ArgumentException($"Source warehouse with ID {sourceWarehouseId} not found");
            }

            if (destinationWarehouse == null)
            {
                throw new ArgumentException($"Destination warehouse with ID {destinationWarehouseId} not found");
            }

            if (!sourceWarehouse.IsActive || !destinationWarehouse.IsActive)
            {
                throw new ArgumentException("Both warehouses must be active");
            }

            var shipmentNumber = await GenerateShipmentNumberAsync();
            
            var shipment = new WarehouseShipment
            {
                ShipmentNumber = shipmentNumber,
                SourceWarehouseId = sourceWarehouseId,
                DestinationWarehouseId = destinationWarehouseId,
                Status = "draft",
                Notes = notes,
                CreatedBy = userId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.WarehouseShipments.Add(shipment);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created warehouse transfer shipment {ShipmentNumber} from {SourceWarehouse} to {DestinationWarehouse} by user {UserId}", 
                shipment.ShipmentNumber, sourceWarehouse.Name, destinationWarehouse.Name, userId);

            return MapToDto(shipment);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating warehouse transfer shipment for user {UserId}", userId);
            throw;
        }
    }

    public async Task<WarehouseShipmentDto?> GetShipmentByIdAsync(int shipmentId)
    {
        try
        {
            // Fetch header via stored function
            var headerSql = "SELECT * FROM GetWarehouseShipmentHeader({0})";
            var header = await _context.Database
                .SqlQueryRaw<WarehouseShipmentHeaderRow>(headerSql, shipmentId)
                .FirstOrDefaultAsync();

            if (header == null)
            {
                return null;
            }

            // Fetch items via stored function
            var itemsSql = "SELECT * FROM GetWarehouseShipmentItems({0})";
            var itemRows = await _context.Database
                .SqlQueryRaw<WarehouseShipmentItemRow>(itemsSql, shipmentId)
                .ToListAsync();

            var dto = new WarehouseShipmentDto
            {
                Id = header.Id,
                ShipmentNumber = header.ShipmentNumber,
                Status = header.Status,
                Notes = header.Notes,
                CreatedAt = header.CreatedAt,
                DispatchedAt = header.DispatchedAt,
                ReceivedAt = header.ReceivedAt,
                UpdatedAt = header.UpdatedAt,
                CreatedBy = header.CreatedBy,
                DispatchedBy = header.DispatchedBy,
                ReceivedBy = header.ReceivedBy,
                Items = itemRows.Select(r => new WarehouseShipmentItemDto
                {
                    Id = r.Id,
                    ShipmentId = r.ShipmentId,
                    ProductBarcode = r.ProductBarcode,
                    ShopifyProductId = r.ShopifyProductId,
                    ShopifyVariantId = r.ShopifyVariantId,
                    ProductTitle = r.ProductTitle,
                    VariantTitle = r.VariantTitle,
                    Sku = r.Sku,
                    QuantityPlanned = r.QuantityPlanned,
                    QuantityDispatched = r.QuantityDispatched,
                    QuantityReceived = r.QuantityReceived,
                    UnitPrice = r.UnitPrice,
                    CompareAtPrice = r.CompareAtPrice,
                    Currency = r.Currency,
                    ProductImageUrl = r.ProductImageUrl,
                    Notes = r.Notes,
                    CreatedAt = r.CreatedAt,
                    UpdatedAt = r.UpdatedAt
                }).ToList()
            };

            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting warehouse shipment {ShipmentId}", shipmentId);
            throw;
        }
    }

    public async Task<WarehouseShipmentListDto> GetShipmentsAsync(int pageNumber = 1, int pageSize = 20, string? status = null)
    {
        try
        {
            var query = _context.WarehouseShipments
                .Include(s => s.Items)
                .AsQueryable();

            if (!string.IsNullOrEmpty(status))
            {
                query = query.Where(s => s.Status == status);
            }

            var totalCount = await query.CountAsync();
            
            var shipments = await query
                .OrderByDescending(s => s.CreatedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new WarehouseShipmentListDto
            {
                Shipments = shipments.Select(MapToDto).ToList(),
                TotalCount = totalCount,
                PageNumber = pageNumber,
                PageSize = pageSize,
                HasNextPage = (pageNumber * pageSize) < totalCount,
                HasPreviousPage = pageNumber > 1
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting warehouse shipments. Page: {PageNumber}, Size: {PageSize}, Status: {Status}", 
                pageNumber, pageSize, status);
            throw;
        }
    }

    public async Task<bool> DeleteShipmentAsync(int shipmentId, string userId)
    {
        try
        {
            var shipment = await _context.WarehouseShipments
                .Include(s => s.Items)
                .FirstOrDefaultAsync(s => s.Id == shipmentId);

            if (shipment == null) return false;

            // Only allow deletion of draft shipments
            if (shipment.Status != "draft")
            {
                throw new InvalidOperationException("Can only delete draft shipments");
            }

            _context.WarehouseShipments.Remove(shipment);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Deleted warehouse shipment {ShipmentNumber} by user {UserId}", 
                shipment.ShipmentNumber, userId);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting warehouse shipment {ShipmentId} by user {UserId}", 
                shipmentId, userId);
            throw;
        }
    }

    public async Task<BarcodeProductInfoDto> GetProductInfoByBarcodeAsync(string barcode, string userId)
    {
        try
        {
            // Convert string userId to Guid
            if (!Guid.TryParse(userId, out var userGuid))
            {
                return new BarcodeProductInfoDto
                {
                    Barcode = barcode,
                    IsFound = false,
                    ErrorMessage = "Invalid user ID"
                };
            }
            
            // Get default Shopify store connection
            var storeConnection = await _storeConnectionService.GetDefaultStoreConnectionAsync(userGuid, "shopify");
            if (storeConnection == null)
            {
                return new BarcodeProductInfoDto
                {
                    Barcode = barcode,
                    IsFound = false,
                    ErrorMessage = "No Shopify store connection found"
                };
            }

            // Decrypt credentials from the store connection
            var credentialsDict = await _storeConnectionService.GetDecryptedCredentialsAsync(storeConnection.Id);
            if (credentialsDict == null || !credentialsDict.ContainsKey("accessToken"))
            {
                return new BarcodeProductInfoDto
                {
                    Barcode = barcode,
                    IsFound = false,
                    ErrorMessage = "No access token found in store connection"
                };
            }

            var credentials = new ShopifyCredentials
            {
                Store = storeConnection.StoreName,
                AccessToken = credentialsDict["accessToken"]
            };
            
            // Execute GraphQL query to search products by barcode
            var query = ShopifyQueries.GetProductsByBarcodeQuery(barcode, 1);
            var response = await _shopifyApiService.ExecuteGraphQLQueryAsync<object>(credentials, query);

            if (!response.Success || response.Data == null)
            {
                _logger.LogWarning("Failed to search Shopify products by barcode {Barcode}: {Error}", 
                    barcode, response.Error);
                return new BarcodeProductInfoDto
                {
                    Barcode = barcode,
                    IsFound = false,
                    ErrorMessage = response.Error ?? "Failed to search products"
                };
            }

            // Parse the response
            var productInfo = ParseBarcodeSearchResponse(response.Data, barcode);
            return productInfo;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching product by barcode {Barcode}", barcode);
            return new BarcodeProductInfoDto
            {
                Barcode = barcode,
                IsFound = false,
                ErrorMessage = "Internal server error"
            };
        }
    }

    public async Task<WarehouseShipmentItemDto> AddProductToShipmentAsync(AddProductToShipmentDto addProductDto, string userId)
    {
        try
        {
            var shipment = await _context.WarehouseShipments
                .FirstOrDefaultAsync(s => s.Id == addProductDto.ShipmentId);

            if (shipment == null)
            {
                throw new ArgumentException("Shipment not found");
            }

            if (shipment.Status != "draft")
            {
                throw new InvalidOperationException("Can only add products to draft shipments");
            }

            // Check if we have complete product info already provided
            bool hasCompleteInfo = !string.IsNullOrEmpty(addProductDto.ShopifyProductId) &&
                                  !string.IsNullOrEmpty(addProductDto.ShopifyVariantId) &&
                                  !string.IsNullOrEmpty(addProductDto.ProductTitle);

            BarcodeProductInfoDto productInfo;

            if (hasCompleteInfo)
            {
                // Use provided product info
                _logger.LogInformation("Using provided product info for barcode {Barcode}", addProductDto.Barcode);
                
                productInfo = new BarcodeProductInfoDto
                {
                    ShopifyProductId = addProductDto.ShopifyProductId!,
                    ShopifyVariantId = addProductDto.ShopifyVariantId!,
                    ProductTitle = addProductDto.ProductTitle!,
                    VariantTitle = addProductDto.VariantTitle,
                    Sku = addProductDto.Sku,
                    Barcode = addProductDto.Barcode,
                    Price = addProductDto.Price ?? 0,
                    CompareAtPrice = addProductDto.CompareAtPrice,
                    Currency = addProductDto.Currency ?? "INR",
                    ImageUrl = addProductDto.ProductImageUrl,
                    IsFound = true
                };
            }
            else
            {
                // Get product info from Shopify
                _logger.LogInformation("Fetching product info from Shopify for barcode {Barcode}", addProductDto.Barcode);
                productInfo = await GetProductInfoByBarcodeAsync(addProductDto.Barcode, userId);
                if (!productInfo.IsFound)
                {
                    throw new ArgumentException($"Product not found for barcode: {addProductDto.Barcode}");
                }
            }

            // Check if product already exists in shipment
            var existingItem = await _context.WarehouseShipmentItems
                .FirstOrDefaultAsync(i => i.ShipmentId == addProductDto.ShipmentId && 
                                         i.ProductBarcode == addProductDto.Barcode);

            WarehouseShipmentItemDto result;
            bool isExistingItem = existingItem != null;

            if (isExistingItem)
            {
                if (existingItem == null)
                {
                    throw new InvalidOperationException("Existing item was unexpectedly null");
                }
                
                // Update quantity
                existingItem.QuantityPlanned += addProductDto.Quantity;
                existingItem.Notes = addProductDto.Notes;
                existingItem.UpdatedAt = DateTime.UtcNow;
                
                await _context.SaveChangesAsync();
                result = MapToItemDto(existingItem);
                result.IsExistingItem = true; // Add flag to indicate this was an update, not a new item
            }
            else
            {
                // Create new item
                if (productInfo == null)
                {
                    throw new ArgumentException($"Product info not found for barcode {addProductDto.Barcode}");
                }

                var newItem = new WarehouseShipmentItem
                {
                    ShipmentId = addProductDto.ShipmentId,
                    ProductBarcode = addProductDto.Barcode,
                    ShopifyProductId = productInfo.ShopifyProductId,
                    ShopifyVariantId = productInfo.ShopifyVariantId,
                    ProductTitle = productInfo.ProductTitle,
                    VariantTitle = productInfo.VariantTitle,
                    Sku = productInfo.Sku,
                    QuantityPlanned = addProductDto.Quantity,
                    UnitPrice = productInfo.CompareAtPrice ?? productInfo.Price,
                    CompareAtPrice = productInfo.CompareAtPrice,
                    Currency = productInfo.Currency,
                    ProductImageUrl = productInfo.ImageUrl,
                    Notes = addProductDto.Notes,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.WarehouseShipmentItems.Add(newItem);
                await _context.SaveChangesAsync();
                result = MapToItemDto(newItem);
                result.IsExistingItem = false; // Add flag to indicate this was a new item
            }

            _logger.LogInformation("Added product {Barcode} to shipment {ShipmentId} by user {UserId}", 
                addProductDto.Barcode, addProductDto.ShipmentId, userId);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding product to shipment. ShipmentId: {ShipmentId}, Barcode: {Barcode}, UserId: {UserId}", 
                addProductDto.ShipmentId, addProductDto.Barcode, userId);
            throw;
        }
    }

    public async Task<bool> RemoveProductFromShipmentAsync(int shipmentId, int itemId, string userId)
    {
        try
        {
            var shipment = await _context.WarehouseShipments
                .FirstOrDefaultAsync(s => s.Id == shipmentId);

            if (shipment == null) return false;

            if (shipment.Status != "draft")
            {
                throw new InvalidOperationException("Can only remove products from draft shipments");
            }

            var item = await _context.WarehouseShipmentItems
                .FirstOrDefaultAsync(i => i.Id == itemId && i.ShipmentId == shipmentId);

            if (item == null) return false;

            _context.WarehouseShipmentItems.Remove(item);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Removed item {ItemId} from shipment {ShipmentId} by user {UserId}", 
                itemId, shipmentId, userId);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing item {ItemId} from shipment {ShipmentId} by user {UserId}", 
                itemId, shipmentId, userId);
            throw;
        }
    }

    public async Task<WarehouseShipmentItemDto> UpdateShipmentItemQuantityAsync(int itemId, int newQuantity, string userId)
    {
        try
        {
            var item = await _context.WarehouseShipmentItems
                .Include(i => i.Shipment)
                .FirstOrDefaultAsync(i => i.Id == itemId);

            if (item == null)
            {
                throw new ArgumentException("Item not found");
            }

            if (item.Shipment.Status != "draft")
            {
                throw new InvalidOperationException("Can only update quantities in draft shipments");
            }

            item.QuantityPlanned = newQuantity;
            item.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Updated item {ItemId} quantity to {Quantity} by user {UserId}", 
                itemId, newQuantity, userId);

            return MapToItemDto(item);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating item {ItemId} quantity by user {UserId}", itemId, userId);
            throw;
        }
    }

    public async Task<WarehouseShipmentDto> DispatchShipmentAsync(DispatchShipmentDto dispatchDto, string userId)
    {
        try
        {
            var shipment = await _context.WarehouseShipments
                .Include(s => s.Items)
                .FirstOrDefaultAsync(s => s.Id == dispatchDto.ShipmentId);

            if (shipment == null)
            {
                throw new ArgumentException("Shipment not found");
            }

            if (shipment.Status != "created")
            {
                throw new InvalidOperationException("Can only dispatch shipments with 'created' status");
            }

            // Update item quantities
            foreach (var dispatchItem in dispatchDto.Items)
            {
                var item = shipment.Items.FirstOrDefault(i => i.Id == dispatchItem.ItemId);
                if (item != null)
                {
                    item.QuantityDispatched = dispatchItem.QuantityDispatched;
                    if (!string.IsNullOrEmpty(dispatchItem.Notes))
                    {
                        item.Notes = item.Notes + " | Dispatch: " + dispatchItem.Notes;
                    }
                    item.UpdatedAt = DateTime.UtcNow;
                }
            }

            // Update shipment status
            shipment.Status = "dispatched";
            shipment.DispatchedAt = DateTime.UtcNow;
            shipment.DispatchedBy = userId;
            shipment.Notes = dispatchDto.Notes;
            shipment.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Dispatched shipment {ShipmentNumber} by user {UserId}", 
                shipment.ShipmentNumber, userId);

            return MapToDto(shipment);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error dispatching shipment {ShipmentId} by user {UserId}", 
                dispatchDto.ShipmentId, userId);
            throw;
        }
    }

    public async Task<WarehouseShipmentDto> ReceiveShipmentAsync(ReceiveShipmentDto receiveDto, string userId)
    {
        try
        {
            var shipment = await _context.WarehouseShipments
                .Include(s => s.Items)
                .FirstOrDefaultAsync(s => s.Id == receiveDto.ShipmentId);

            if (shipment == null)
            {
                throw new ArgumentException("Shipment not found");
            }

            if (shipment.Status != "dispatched")
            {
                throw new InvalidOperationException("Can only receive dispatched shipments");
            }

            // Update item quantities
            foreach (var receiveItem in receiveDto.Items)
            {
                var item = shipment.Items.FirstOrDefault(i => i.Id == receiveItem.ItemId);
                if (item != null)
                {
                    item.QuantityReceived = receiveItem.QuantityReceived;
                    if (!string.IsNullOrEmpty(receiveItem.Notes))
                    {
                        item.Notes = item.Notes + " | Receive: " + receiveItem.Notes;
                    }
                    item.UpdatedAt = DateTime.UtcNow;
                }
            }

            // Update shipment status
            shipment.Status = "received";
            shipment.ReceivedAt = DateTime.UtcNow;
            shipment.ReceivedBy = userId;
            shipment.Notes = receiveDto.Notes;
            shipment.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Received shipment {ShipmentNumber} by user {UserId}", 
                shipment.ShipmentNumber, userId);

            return MapToDto(shipment);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error receiving shipment {ShipmentId} by user {UserId}", 
                receiveDto.ShipmentId, userId);
            throw;
        }
    }

    public async Task<WarehouseShipmentDto> CompleteShipmentAsync(int shipmentId, string userId)
    {
        try
        {
            var shipment = await _context.WarehouseShipments
                .Include(s => s.Items)
                .FirstOrDefaultAsync(s => s.Id == shipmentId);

            if (shipment == null)
            {
                throw new ArgumentException("Shipment not found");
            }

            if (shipment.Status != "received")
            {
                throw new InvalidOperationException("Can only complete received shipments");
            }

            shipment.Status = "completed";
            shipment.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Completed shipment {ShipmentNumber} by user {UserId}", 
                shipment.ShipmentNumber, userId);

            return MapToDto(shipment);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error completing shipment {ShipmentId} by user {UserId}", 
                shipmentId, userId);
            throw;
        }
    }

    public async Task<WarehouseShipmentDto> UpdateShipmentStatusAsync(int shipmentId, string newStatus, string userId)
    {
        try
        {
            var shipment = await _context.WarehouseShipments
                .Include(s => s.Items)
                .FirstOrDefaultAsync(s => s.Id == shipmentId);

            if (shipment == null)
            {
                throw new ArgumentException("Shipment not found");
            }

            // Validate status transition
            if (!IsValidStatusTransition(shipment.Status, newStatus))
            {
                throw new InvalidOperationException($"Invalid status transition from {shipment.Status} to {newStatus}");
            }

            shipment.Status = newStatus;
            
            // Set appropriate timestamps
            switch (newStatus)
            {
                case "created":
                    break;
                case "dispatched":
                    shipment.DispatchedAt = DateTime.UtcNow;
                    shipment.DispatchedBy = userId;
                    break;
                case "received":
                    shipment.ReceivedAt = DateTime.UtcNow;
                    shipment.ReceivedBy = userId;
                    break;
            }

            shipment.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Updated shipment {ShipmentNumber} status to {Status} by user {UserId}", 
                shipment.ShipmentNumber, newStatus, userId);

            return MapToDto(shipment);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating shipment {ShipmentId} status by user {UserId}", 
                shipmentId, userId);
            throw;
        }
    }

    public async Task<WarehouseShipmentDto> UpdateShipmentNotesAsync(int shipmentId, string notes, string userId)
    {
        try
        {
            var shipment = await _context.WarehouseShipments
                .Include(s => s.Items)
                .FirstOrDefaultAsync(s => s.Id == shipmentId);

            if (shipment == null)
            {
                throw new ArgumentException("Shipment not found");
            }

            shipment.Notes = notes;
            shipment.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return MapToDto(shipment);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating shipment {ShipmentId} notes by user {UserId}", 
                shipmentId, userId);
            throw;
        }
    }

    public async Task<object> GetShipmentAnalyticsAsync(DateTime? startDate = null, DateTime? endDate = null)
    {
        try
        {
            var query = _context.WarehouseShipments.AsQueryable();

            if (startDate.HasValue)
                query = query.Where(s => s.CreatedAt >= startDate.Value);
            
            if (endDate.HasValue)
                query = query.Where(s => s.CreatedAt <= endDate.Value);

            var analytics = await query
                .GroupBy(s => s.Status)
                .Select(g => new { Status = g.Key, Count = g.Count() })
                .ToListAsync();

            var totalShipments = await query.CountAsync();
            var totalItems = await _context.WarehouseShipmentItems
                .Where(i => query.Any(s => s.Id == i.ShipmentId))
                .SumAsync(i => i.QuantityPlanned);

            return new
            {
                StatusBreakdown = analytics,
                TotalShipments = totalShipments,
                TotalItemsPlanned = totalItems,
                DateRange = new { StartDate = startDate, EndDate = endDate }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting shipment analytics");
            throw;
        }
    }

    public async Task<List<WarehouseShipmentDto>> GetPendingDispatchShipmentsAsync()
    {
        try
        {
            var shipments = await _context.WarehouseShipments
                .Include(s => s.Items)
                .Where(s => s.Status == "created")
                .OrderBy(s => s.CreatedAt)
                .ToListAsync();

            return shipments.Select(MapToDto).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting pending dispatch shipments");
            throw;
        }
    }

    public async Task<List<WarehouseShipmentDto>> GetPendingReceiveShipmentsAsync()
    {
        try
        {
            var shipments = await _context.WarehouseShipments
                .Include(s => s.Items)
                .Where(s => s.Status == "dispatched")
                .OrderBy(s => s.DispatchedAt)
                .ToListAsync();

            return shipments.Select(MapToDto).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting pending receive shipments");
            throw;
        }
    }

    public async Task<WarehouseShipmentDto> AddProductToShipmentWithFullDataAsync(AddProductToShipmentDto addProductDto, string userId)
    {
        try
        {
            // First add the product using existing method
            await AddProductToShipmentAsync(addProductDto, userId);
            
            // Then return the full shipment data
            var shipment = await _context.WarehouseShipments
                .Include(s => s.Items)
                .Include(s => s.SourceWarehouse)
                .Include(s => s.DestinationWarehouse)
                .FirstOrDefaultAsync(s => s.Id == addProductDto.ShipmentId);
                
            if (shipment == null)
            {
                throw new ArgumentException("Shipment not found");
            }
            
            return MapToDto(shipment);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding product with full data return. ShipmentId: {ShipmentId}, Barcode: {Barcode}, UserId: {UserId}", 
                addProductDto.ShipmentId, addProductDto.Barcode, userId);
            throw;
        }
    }

    // Private helper methods
    private async Task<string> GenerateShipmentNumberAsync()
    {
        var date = DateTime.UtcNow.ToString("yyyyMMdd");
        var todayShipments = await _context.WarehouseShipments
            .Where(s => s.ShipmentNumber.StartsWith($"MLT-{date}"))
            .CountAsync();
        
        var sequence = (todayShipments + 1).ToString("D4");
        return $"MLT-{date}-{sequence}";
    }

    private BarcodeProductInfoDto ParseBarcodeSearchResponse(object responseData, string barcode)
    {
        try
        {
            var jsonElement = (JsonElement)responseData;
            
            if (!jsonElement.TryGetProperty("data", out var dataElement) ||
                !dataElement.TryGetProperty("productVariants", out var variantsElement) ||
                !variantsElement.TryGetProperty("edges", out var edgesElement))
            {
                return new BarcodeProductInfoDto
                {
                    Barcode = barcode,
                    IsFound = false,
                    ErrorMessage = "Invalid response format"
                };
            }

            var edges = edgesElement.EnumerateArray().ToList();
            if (!edges.Any())
            {
                return new BarcodeProductInfoDto
                {
                    Barcode = barcode,
                    IsFound = false,
                    ErrorMessage = "Product not found"
                };
            }

            var firstVariant = edges.First().GetProperty("node");
            var product = firstVariant.GetProperty("product");

            var productInfo = new BarcodeProductInfoDto
            {
                ShopifyProductId = GetStringProperty(product, "id"),
                ShopifyVariantId = GetStringProperty(firstVariant, "id"),
                ProductTitle = GetStringProperty(product, "title"),
                VariantTitle = GetStringProperty(firstVariant, "title"),
                Sku = GetStringProperty(firstVariant, "sku"),
                Barcode = barcode,
                Price = GetDecimalProperty(firstVariant, "price"),
                CompareAtPrice = GetDecimalProperty(firstVariant, "compareAtPrice"),
                Currency = "INR", // Default currency
                AvailableQuantity = GetIntProperty(firstVariant, "inventoryQuantity"),
                IsFound = true
            };

            // Get image URL
            if (firstVariant.TryGetProperty("image", out var imageElement) && imageElement.ValueKind != JsonValueKind.Null)
            {
                productInfo.ImageUrl = GetStringProperty(imageElement, "url");
            }
            else if (product.TryGetProperty("featuredImage", out var featuredImageElement) && featuredImageElement.ValueKind != JsonValueKind.Null)
            {
                productInfo.ImageUrl = GetStringProperty(featuredImageElement, "url");
            }

            return productInfo;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parsing barcode search response for barcode {Barcode}", barcode);
            return new BarcodeProductInfoDto
            {
                Barcode = barcode,
                IsFound = false,
                ErrorMessage = "Error parsing response"
            };
        }
    }

    private bool IsValidStatusTransition(string currentStatus, string newStatus)
    {
        var validTransitions = new Dictionary<string, string[]>
        {
            ["draft"] = new[] { "created" },
            ["created"] = new[] { "dispatched", "draft" },
            ["dispatched"] = new[] { "received" },
            ["received"] = new[] { "completed" }
        };

        return validTransitions.ContainsKey(currentStatus) && 
               validTransitions[currentStatus].Contains(newStatus);
    }

    private WarehouseShipmentDto MapToDto(WarehouseShipment shipment)
    {
        return new WarehouseShipmentDto
        {
            Id = shipment.Id,
            ShipmentNumber = shipment.ShipmentNumber,
            Status = shipment.Status,
            Notes = shipment.Notes,
            CreatedAt = shipment.CreatedAt,
            DispatchedAt = shipment.DispatchedAt,
            ReceivedAt = shipment.ReceivedAt,
            UpdatedAt = shipment.UpdatedAt,
            CreatedBy = shipment.CreatedBy,
            DispatchedBy = shipment.DispatchedBy,
            ReceivedBy = shipment.ReceivedBy,
            Items = shipment.Items?.Select(MapToItemDto).ToList() ?? new List<WarehouseShipmentItemDto>()
        };
    }

    private WarehouseShipmentItemDto MapToItemDto(WarehouseShipmentItem item)
    {
        return new WarehouseShipmentItemDto
        {
            Id = item.Id,
            ShipmentId = item.ShipmentId,
            ProductBarcode = item.ProductBarcode,
            ShopifyProductId = item.ShopifyProductId,
            ShopifyVariantId = item.ShopifyVariantId,
            ProductTitle = item.ProductTitle,
            VariantTitle = item.VariantTitle,
            Sku = item.Sku,
            QuantityPlanned = item.QuantityPlanned,
            QuantityDispatched = item.QuantityDispatched,
            QuantityReceived = item.QuantityReceived,
            UnitPrice = item.UnitPrice,
            CompareAtPrice = item.CompareAtPrice,
            Currency = item.Currency,
            ProductImageUrl = item.ProductImageUrl,
            Notes = item.Notes,
            CreatedAt = item.CreatedAt,
            UpdatedAt = item.UpdatedAt
        };
    }

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
} 