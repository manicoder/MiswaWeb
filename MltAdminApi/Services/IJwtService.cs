using Mlt.Admin.Api.Models;

namespace Mlt.Admin.Api.Services;

public interface IJwtService
{
    string GenerateToken(User user);
    bool ValidateToken(string token);
    Guid? GetUserIdFromToken(string token);
} 