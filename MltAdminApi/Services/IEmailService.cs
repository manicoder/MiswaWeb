using System.Threading.Tasks;
using Mlt.Admin.Api.Models.DTOs;

namespace Mlt.Admin.Api.Services
{
    public interface IEmailService
    {
        Task<bool> SendEmailAsync(string to, string subject, string htmlContent, string? textContent = null);
        Task<bool> SendInvitationEmailAsync(string to, string invitationLink, string inviterName, string companyName);
        Task<bool> SendPasswordResetEmailAsync(string to, string resetLink);
        Task<bool> SendOTPEmailAsync(string to, string otpCode);
        Task<bool> SendOTPEmailAsync(string to, string otpCode, string purpose);
        Task<bool> TestConnectionAsync();
        void ConfigureProvider(string provider, Dictionary<string, string> settings);
    }
} 