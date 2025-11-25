using Mlt.Admin.Api.Models.DTOs;

namespace Mlt.Admin.Api.Services;

public interface IWarehouseShipmentService
{
    // Shipment management
    Task<WarehouseShipmentDto> CreateShipmentAsync(CreateWarehouseShipmentDto createDto, string userId);
    Task<WarehouseShipmentDto> CreateWarehouseTransferAsync(int sourceWarehouseId, int destinationWarehouseId, string? notes, string userId);
    Task<WarehouseShipmentDto?> GetShipmentByIdAsync(int shipmentId);
    Task<WarehouseShipmentListDto> GetShipmentsAsync(int pageNumber = 1, int pageSize = 20, string? status = null);
    Task<bool> DeleteShipmentAsync(int shipmentId, string userId);

    // Product management within shipments
    Task<BarcodeProductInfoDto> GetProductInfoByBarcodeAsync(string barcode, string userId);
    Task<WarehouseShipmentItemDto> AddProductToShipmentAsync(AddProductToShipmentDto addProductDto, string userId);
    Task<bool> RemoveProductFromShipmentAsync(int shipmentId, int itemId, string userId);
    Task<WarehouseShipmentItemDto> UpdateShipmentItemQuantityAsync(int itemId, int newQuantity, string userId);

    // Workflow operations
    Task<WarehouseShipmentDto> DispatchShipmentAsync(DispatchShipmentDto dispatchDto, string userId);
    Task<WarehouseShipmentDto> ReceiveShipmentAsync(ReceiveShipmentDto receiveDto, string userId);
    Task<WarehouseShipmentDto> CompleteShipmentAsync(int shipmentId, string userId);

    // Status updates
    Task<WarehouseShipmentDto> UpdateShipmentStatusAsync(int shipmentId, string newStatus, string userId);
    Task<WarehouseShipmentDto> UpdateShipmentNotesAsync(int shipmentId, string notes, string userId);

    // Analytics and reporting
    Task<object> GetShipmentAnalyticsAsync(DateTime? startDate = null, DateTime? endDate = null);
    Task<List<WarehouseShipmentDto>> GetPendingDispatchShipmentsAsync();
    Task<List<WarehouseShipmentDto>> GetPendingReceiveShipmentsAsync();
} 