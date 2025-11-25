using Mlt.Admin.Api.Models.DTOs;
using Mlt.Admin.Api.Models;

namespace Mlt.Admin.Api.Services
{
    public interface IInvitationService
    {
        Task<SendInvitationResponse> SendInvitationAsync(SendInvitationRequest request, string inviterName);
        Task<ValidateInvitationResponse> ValidateInvitationAsync(string token);
        Task<AcceptInvitationResponse> AcceptInvitationAsync(AcceptInvitationRequest request);
        Task<SendInvitationResponse> ResendInvitationAsync(string email, string inviterName);
        Task<bool> CancelInvitationAsync(int invitationId);
        Task<InvitationListResponse> GetPendingInvitationsAsync();
        Task<InvitationListResponse> GetAllInvitationsAsync();
        Task<bool> CleanupExpiredInvitationsAsync();
    }
} 