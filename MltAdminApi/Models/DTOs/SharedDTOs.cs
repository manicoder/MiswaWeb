using System.ComponentModel.DataAnnotations;

namespace Mlt.Admin.Api.Models.DTOs;

/// <summary>
/// Shared DTOs that define the contract between frontend and backend
/// These should be the single source of truth for data structures
/// </summary>

// Core User DTOs
public class UserDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public List<UserPermissionDto> Permissions { get; set; } = new();
}

public class UserPermissionDto
{
    public string TabId { get; set; } = string.Empty;
    public string TabName { get; set; } = string.Empty;
    public bool HasAccess { get; set; }
}

// API Response Wrapper
public class ApiResponse<T>
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public T? Data { get; set; }
    public List<string> Errors { get; set; } = new();
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

// Pagination
public class PagedResponse<T> : ApiResponse<T>
{
    public int CurrentPage { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
    public int TotalCount { get; set; }
    public bool HasNextPage => CurrentPage < TotalPages;
    public bool HasPreviousPage => CurrentPage > 1;
}

// Validation Response
public class ValidationResult
{
    public bool IsValid { get; set; }
    public List<string> Errors { get; set; } = new();
    
    public static ValidationResult Success() => new() { IsValid = true };
    public static ValidationResult Failure(params string[] errors) => new() 
    { 
        IsValid = false, 
        Errors = errors.ToList() 
    };
}

// Available Tab DTO
public class AvailableTabDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public bool IsCore { get; set; }
    public string? Description { get; set; }
}

// Store credentials now handled by StoreConnectionService and StoreConnectionDTOs

// Job Management DTOs
public class JobManagementOrderDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string FulfillmentStatus { get; set; } = string.Empty;
    public string FinancialStatus { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public string Currency { get; set; } = string.Empty;
    public CustomerInfoDto? Customer { get; set; }
    public ShippingAddressDto? ShippingAddress { get; set; }
    public List<FulfillmentDto> Fulfillments { get; set; } = new();
    public List<LineItemDto> LineItems { get; set; } = new();
    public OrderPickupStatusDto? PickupStatus { get; set; }
}

public class CustomerInfoDto
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FullName => $"{FirstName} {LastName}".Trim();
}

public class ShippingAddressDto
{
    public string Name { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Address1 { get; set; } = string.Empty;
    public string Address2 { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Province { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public string Zip { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string FullAddress => $"{Address1}{(string.IsNullOrEmpty(Address2) ? "" : ", " + Address2)}, {City}, {Province} {Zip}, {Country}".Trim();
}

public class FulfillmentDto
{
    public string Id { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public TrackingInfoDto? TrackingInfo { get; set; }
    public FulfillmentServiceDto? Service { get; set; }
    public List<LineItemDto> LineItems { get; set; } = new();
}

public class TrackingInfoDto
{
    public string Number { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string Company { get; set; } = string.Empty;
}

public class FulfillmentServiceDto
{
    public string ServiceName { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
}

public class LineItemDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = string.Empty;
    public ProductImageDto? Image { get; set; }
}

public class ProductImageDto
{
    public string Url { get; set; } = string.Empty;
    public string AltText { get; set; } = string.Empty;
}

public class CourierGroupDto
{
    public string CourierName { get; set; } = string.Empty;
    public int OrderCount { get; set; }
    public List<JobManagementOrderDto> Orders { get; set; } = new();
}

public class JobManagementResponseDto
{
    public List<CourierGroupDto> CourierGroups { get; set; } = new();
    public int TotalOrders { get; set; }
    public string? NextCursor { get; set; }
    public bool HasNextPage { get; set; }
}

// Order Pickup Status DTOs
public class OrderPickupStatusDto
{
    public int Id { get; set; }
    public string ShopifyOrderId { get; set; } = string.Empty;
    public string OrderName { get; set; } = string.Empty;
    public string PickupStatus { get; set; } = "not_pickup"; // pickup, not_pickup, missing
    public string? Notes { get; set; }
    public DateTime FulfillmentDate { get; set; }
    public string CourierCompany { get; set; } = string.Empty;
    public string TrackingNumber { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public string? UpdatedBy { get; set; }
}

public class UpdatePickupStatusDto
{
    [Required]
    public string ShopifyOrderId { get; set; } = string.Empty;
    
    [Required]
    public string OrderName { get; set; } = string.Empty;
    
    [Required]
    [RegularExpression("^(pickup|not_pickup|missing)$", ErrorMessage = "Status must be 'pickup', 'not_pickup', or 'missing'")]
    public string PickupStatus { get; set; } = string.Empty;
    
    [MaxLength(1000)]
    public string? Notes { get; set; }
    
    [Required]
    public DateTime FulfillmentDate { get; set; }
    
    [Required]
    public string CourierCompany { get; set; } = string.Empty;
    
    [Required]
    public string TrackingNumber { get; set; } = string.Empty;
} 