using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Mlt.Admin.Api.Models.DTOs;
using Mlt.Admin.Api.Services;
using System.Security.Claims;

namespace Mlt.Admin.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class InvitationController : ControllerBase
    {
        private readonly IInvitationService _invitationService;
        private readonly IEmailService _emailService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<InvitationController> _logger;

        public InvitationController(
            IInvitationService invitationService, 
            IEmailService emailService,
            IConfiguration configuration,
            ILogger<InvitationController> logger)
        {
            _invitationService = invitationService;
            _emailService = emailService;
            _configuration = configuration;
            _logger = logger;
        }

        /// <summary>
        /// Send invitation to a new user
        /// </summary>
        [HttpPost("send")]
        [Authorize]
        public async Task<ActionResult<SendInvitationResponse>> SendInvitation([FromBody] SendInvitationRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                // Get the inviter name from the current user
                var inviterName = User.FindFirst(ClaimTypes.Name)?.Value ?? 
                                 User.FindFirst("name")?.Value ?? 
                                 "Admin";

                var result = await _invitationService.SendInvitationAsync(request, inviterName);

                if (result.Success)
                {
                    return Ok(result);
                }

                return BadRequest(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending invitation");
                return StatusCode(500, new SendInvitationResponse
                {
                    Success = false,
                    Message = "An internal error occurred while sending the invitation."
                });
            }
        }

        /// <summary>
        /// Validate invitation token
        /// </summary>
        [HttpPost("validate")]
        [AllowAnonymous]
        public async Task<ActionResult<ValidateInvitationResponse>> ValidateInvitation([FromBody] ValidateInvitationRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var result = await _invitationService.ValidateInvitationAsync(request.Token);
                
                if (result.Success)
                {
                    return Ok(result);
                }

                return BadRequest(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating invitation");
                return StatusCode(500, new ValidateInvitationResponse
                {
                    Success = false,
                    Valid = false,
                    Message = "An internal error occurred while validating the invitation."
                });
            }
        }

        /// <summary>
        /// Accept invitation and create user account
        /// </summary>
        [HttpPost("accept")]
        [AllowAnonymous]
        public async Task<ActionResult<AcceptInvitationResponse>> AcceptInvitation([FromBody] AcceptInvitationRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var result = await _invitationService.AcceptInvitationAsync(request);

                if (result.Success)
                {
                    return Ok(result);
                }

                return BadRequest(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error accepting invitation");
                return StatusCode(500, new AcceptInvitationResponse
                {
                    Success = false,
                    Message = "An internal error occurred while accepting the invitation."
                });
            }
        }

        /// <summary>
        /// Resend invitation to an email
        /// </summary>
        [HttpPost("resend")]
        [Authorize]
        public async Task<ActionResult<SendInvitationResponse>> ResendInvitation([FromBody] ResendInvitationRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var inviterName = User.FindFirst(ClaimTypes.Name)?.Value ?? 
                                 User.FindFirst("name")?.Value ?? 
                                 "Admin";

                var result = await _invitationService.ResendInvitationAsync(request.Email, inviterName);

                if (result.Success)
                {
                    return Ok(result);
                }

                return BadRequest(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resending invitation");
                return StatusCode(500, new SendInvitationResponse
                {
                    Success = false,
                    Message = "An internal error occurred while resending the invitation."
                });
            }
        }

        /// <summary>
        /// Cancel invitation
        /// </summary>
        [HttpPost("cancel")]
        [Authorize]
        public async Task<ActionResult> CancelInvitation([FromBody] CancelInvitationRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var result = await _invitationService.CancelInvitationAsync(request.InvitationId);

                if (result)
                {
                    return Ok(new { Success = true, Message = "Invitation cancelled successfully." });
                }

                return BadRequest(new { Success = false, Message = "Failed to cancel invitation. It may have already been accepted or doesn't exist." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cancelling invitation");
                return StatusCode(500, new { Success = false, Message = "An internal error occurred while cancelling the invitation." });
            }
        }

        /// <summary>
        /// Get all pending invitations
        /// </summary>
        [HttpGet("pending")]
        [Authorize]
        public async Task<ActionResult<InvitationListResponse>> GetPendingInvitations()
        {
            try
            {
                var result = await _invitationService.GetPendingInvitationsAsync();
                
                if (result.Success)
                {
                    return Ok(result);
                }

                return BadRequest(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving pending invitations");
                return StatusCode(500, new InvitationListResponse
                {
                    Success = false,
                    Invitations = new List<InvitationDto>()
                });
            }
        }

        /// <summary>
        /// Get all invitations (pending, accepted, expired, cancelled)
        /// </summary>
        [HttpGet("all")]
        [Authorize]
        public async Task<ActionResult<InvitationListResponse>> GetAllInvitations()
        {
            try
            {
                var result = await _invitationService.GetAllInvitationsAsync();
                
                if (result.Success)
                {
                    return Ok(result);
                }

                return BadRequest(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving all invitations");
                return StatusCode(500, new InvitationListResponse
                {
                    Success = false,
                    Invitations = new List<InvitationDto>()
                });
            }
        }

        /// <summary>
        /// Clean up expired invitations (admin utility)
        /// </summary>
        [HttpPost("cleanup")]
        [Authorize]
        public async Task<ActionResult> CleanupExpiredInvitations()
        {
            try
            {
                var result = await _invitationService.CleanupExpiredInvitationsAsync();

                if (result)
                {
                    return Ok(new { Success = true, Message = "Expired invitations cleaned up successfully." });
                }

                return BadRequest(new { Success = false, Message = "Failed to clean up expired invitations." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cleaning up expired invitations");
                return StatusCode(500, new { Success = false, Message = "An internal error occurred while cleaning up expired invitations." });
            }
        }

        /// <summary>
        /// Get invitation statistics
        /// </summary>
        [HttpGet("stats")]
        [Authorize]
        public async Task<ActionResult> GetInvitationStats()
        {
            try
            {
                var allInvitations = await _invitationService.GetAllInvitationsAsync();

                if (!allInvitations.Success)
                {
                    return BadRequest(allInvitations);
                }

                var stats = new
                {
                    TotalInvitations = allInvitations.TotalCount,
                    PendingInvitations = allInvitations.PendingCount,
                    ExpiredInvitations = allInvitations.ExpiredCount,
                    AcceptedInvitations = allInvitations.Invitations.Count(i => i.Status == "Accepted"),
                    CancelledInvitations = allInvitations.Invitations.Count(i => i.Status == "Cancelled")
                };

                return Ok(new { Success = true, Stats = stats });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving invitation statistics");
                return StatusCode(500, new { Success = false, Message = "An internal error occurred while retrieving invitation statistics." });
            }
        }

        /// <summary>
        /// Test email configuration by sending a test email
        /// </summary>
        [HttpPost("test-email")]
        [AllowAnonymous] // Allow testing without authentication
        public async Task<ActionResult> TestEmailConfiguration([FromBody] TestEmailRequest request)
        {
            try
            {
                _logger.LogInformation($"🧪 Testing email configuration - sending to {request.Email}");

                var frontendUrl = _configuration.GetValue<string>("Frontend:BaseUrl") ?? "http://localhost:5173";
                var invitationLink = $"{frontendUrl}/auth/accept-invitation?token=test-token-123";

                var success = await _emailService.SendInvitationEmailAsync(
                    request.Email,
                    invitationLink,
                    "System Administrator",
                    "MLT Admin System"
                );

                if (success)
                {
                    return Ok(new 
                    { 
                        Success = true, 
                        Message = $"✅ Test email sent successfully to {request.Email}",
                        EmailProvider = _configuration["Email:Provider"],
                        Timestamp = DateTime.UtcNow
                    });
                }
                else
                {
                    return BadRequest(new 
                    { 
                        Success = false, 
                        Message = "❌ Failed to send test email. Check email configuration and logs.",
                        EmailProvider = _configuration["Email:Provider"]
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error testing email configuration");
                return StatusCode(500, new 
                { 
                    Success = false, 
                    Message = $"❌ Email test failed: {ex.Message}",
                    EmailProvider = _configuration["Email:Provider"]
                });
            }
        }

        public class TestEmailRequest
        {
            public string Email { get; set; } = string.Empty;
        }
    }
} 