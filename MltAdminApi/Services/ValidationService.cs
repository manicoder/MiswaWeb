using System.Text.RegularExpressions;
using Mlt.Admin.Api.Models.DTOs;

namespace Mlt.Admin.Api.Services;

public interface IValidationService
{
    ValidationResult ValidateEmail(string email);
    ValidationResult ValidatePassword(string password);
    ValidationResult ValidatePhoneNumber(string phoneNumber);
    ValidationResult ValidateUrl(string url);
    ValidationResult ValidateUserPermissions(List<UserPermissionDto> permissions);
    ValidationResult ValidateInvitationRequest(string email, string name, string role);
}

public class ValidationService : IValidationService
{
    private readonly ILogger<ValidationService> _logger;

    public ValidationService(ILogger<ValidationService> logger)
    {
        _logger = logger;
    }

    public ValidationResult ValidateEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return ValidationResult.Failure("Email is required");

        var emailPattern = @"^[^\s@]+@[^\s@]+\.[^\s@]+$";
        if (!Regex.IsMatch(email, emailPattern))
            return ValidationResult.Failure("Invalid email format");

        if (email.Length > 255)
            return ValidationResult.Failure("Email must be less than 255 characters");

        return ValidationResult.Success();
    }

    public ValidationResult ValidatePassword(string password)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(password))
        {
            return ValidationResult.Failure("Password is required");
        }

        if (password.Length < 8)
            errors.Add("Password must be at least 8 characters long");

        if (!Regex.IsMatch(password, @"[A-Z]"))
            errors.Add("Password must contain at least one uppercase letter");

        if (!Regex.IsMatch(password, @"[a-z]"))
            errors.Add("Password must contain at least one lowercase letter");

        if (!Regex.IsMatch(password, @"[0-9]"))
            errors.Add("Password must contain at least one number");

        if (!Regex.IsMatch(password, @"[!@#$%^&*()_+\-=\[\]{};':""\\|,.<>\/?]"))
            errors.Add("Password must contain at least one special character");

        return errors.Any() ? ValidationResult.Failure(errors.ToArray()) : ValidationResult.Success();
    }

    public ValidationResult ValidatePhoneNumber(string phoneNumber)
    {
        if (string.IsNullOrWhiteSpace(phoneNumber))
            return ValidationResult.Success(); // Phone number is optional

        // International phone number pattern
        var phonePattern = @"^\+?[1-9]\d{9,14}$";
        if (!Regex.IsMatch(phoneNumber, phonePattern))
            return ValidationResult.Failure("Invalid phone number format");

        return ValidationResult.Success();
    }

    public ValidationResult ValidateUrl(string url)
    {
        if (string.IsNullOrWhiteSpace(url))
            return ValidationResult.Failure("URL is required");

        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
            return ValidationResult.Failure("Invalid URL format");

        if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)
            return ValidationResult.Failure("URL must use HTTP or HTTPS protocol");

        return ValidationResult.Success();
    }

    public ValidationResult ValidateUserPermissions(List<UserPermissionDto> permissions)
    {
        if (permissions == null || !permissions.Any())
            return ValidationResult.Failure("At least one permission must be specified");

        var errors = new List<string>();

        // Validate each permission
        foreach (var permission in permissions)
        {
            if (string.IsNullOrWhiteSpace(permission.TabId))
                errors.Add("Tab ID is required for all permissions");

            if (string.IsNullOrWhiteSpace(permission.TabName))
                errors.Add("Tab name is required for all permissions");
        }

        // Check for duplicate permissions
        var duplicateTabIds = permissions
            .GroupBy(p => p.TabId)
            .Where(g => g.Count() > 1)
            .Select(g => g.Key)
            .ToList();

        if (duplicateTabIds.Any())
            errors.Add($"Duplicate permissions found for tabs: {string.Join(", ", duplicateTabIds)}");

        return errors.Any() ? ValidationResult.Failure(errors.ToArray()) : ValidationResult.Success();
    }

    public ValidationResult ValidateInvitationRequest(string email, string name, string role)
    {
        var errors = new List<string>();

        // Validate email
        var emailValidation = ValidateEmail(email);
        if (!emailValidation.IsValid)
            errors.AddRange(emailValidation.Errors);

        // Validate name
        if (string.IsNullOrWhiteSpace(name))
            errors.Add("Name is required");
        else if (name.Length > 255)
            errors.Add("Name must be less than 255 characters");

        // Validate role
        if (string.IsNullOrWhiteSpace(role))
            errors.Add("Role is required");
        else if (!IsValidRole(role))
            errors.Add("Invalid role specified");

        return errors.Any() ? ValidationResult.Failure(errors.ToArray()) : ValidationResult.Success();
    }

    private bool IsValidRole(string role)
    {
        var validRoles = new[] { "superadmin", "admin", "user", "SuperAdmin", "Admin", "User", "0", "1", "2" };
        return validRoles.Contains(role, StringComparer.OrdinalIgnoreCase);
    }
} 