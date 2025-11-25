using System.ComponentModel.DataAnnotations;

namespace Mlt.Admin.Api.Models;

public class UserPermission
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid UserId { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string TabId { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(255)]
    public string TabName { get; set; } = string.Empty;
    
    public bool HasAccess { get; set; } = false;
    
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    
    // Navigation property
    public virtual User User { get; set; } = null!;
}

public static class AvailableTabs
{
    public const string Dashboard = "dashboard";
    public const string Orders = "orders";
    public const string Products = "products";
    public const string Inventory = "inventory";
    public const string Customers = "customers";
    public const string Analytics = "analytics";
    public const string PdfTools = "pdf-tools";
    public const string ImageTools = "image-tools";
    public const string BarcodeTools = "barcode-tools";
    public const string UserManagement = "user-management";
    public const string Settings = "settings";
    
    public static readonly Dictionary<string, string> TabNames = new()
    {
        { Dashboard, "Dashboard" },
        { Orders, "Orders" },
        { Products, "Products" },
        { Inventory, "Inventory" },
        { Customers, "Customers" },
        { Analytics, "Analytics" },
        { PdfTools, "PDF Tools" },
        { ImageTools, "Image Tools" },
        { BarcodeTools, "Barcode Tools" },
        { UserManagement, "User Management" },
        { Settings, "Settings" }
    };
    
    public static readonly string[] CoreTabs = { Dashboard, Orders };
    public static readonly string[] AdminOnlyTabs = { UserManagement, Settings };
} 