using Mlt.Admin.Api.Core.DTOs;
using Mlt.Admin.Api.Core.Entities;
using Mlt.Admin.Api.Core.Enums;

namespace Mlt.Admin.Api.Core.Interfaces
{
    /// <summary>
    /// Generic interface for order services across all platforms
    /// </summary>
    /// <typeparam name="TOrder">The platform-specific order type</typeparam>
    public interface IOrderService<TOrder> where TOrder : BaseOrder
    {
        Task<PagedResult<TOrder>> GetOrdersAsync(Guid storeConnectionId, OrderFilterDto filters);
        Task<TOrder?> GetOrderByIdAsync(Guid orderId);
        Task<TOrder?> GetOrderByPlatformIdAsync(string platformOrderId, Guid storeConnectionId);
        Task<TOrder> CreateOrderAsync(TOrder order);
        Task<TOrder> UpdateOrderAsync(TOrder order);
        Task<bool> DeleteOrderAsync(Guid orderId);
        Task<int> SyncOrdersAsync(Guid storeConnectionId);
        Task<List<TOrder>> SearchOrdersAsync(Guid storeConnectionId, string searchQuery);
        Platform Platform { get; }
    }
} 