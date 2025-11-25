using MltAdminApi.Models;
using MltAdminApi.Models.DTOs;

namespace MltAdminApi.Services
{
    public interface IWarehouseService
    {
        // Warehouse Management
        Task<WarehouseListResponse> GetWarehousesAsync();
        Task<WarehouseResponse?> GetWarehouseByIdAsync(int id);
        Task<WarehouseResponse?> GetWarehouseByCodeAsync(string code);
        Task<WarehouseResponse> CreateWarehouseAsync(CreateWarehouseRequest request, string createdBy);
        Task<WarehouseResponse?> UpdateWarehouseAsync(int id, UpdateWarehouseRequest request);
        Task<bool> DeleteWarehouseAsync(int id);
        Task<bool> SetDefaultSourceWarehouseAsync(int id);
        
        // Warehouse Statistics
        Task<WarehouseResponse?> GetWarehouseWithStatsAsync(int id);
        Task<List<WarehouseResponse>> GetActiveWarehousesAsync();
        
        // Warehouse Transfer Support
        Task<bool> ValidateWarehouseTransferAsync(int sourceWarehouseId, int destinationWarehouseId);
        Task<List<WarehouseTransferReportResponse>> GetWarehouseTransferReportsAsync(
            int? sourceWarehouseId = null, 
            int? destinationWarehouseId = null,
            DateTime? startDate = null, 
            DateTime? endDate = null);
    }
} 