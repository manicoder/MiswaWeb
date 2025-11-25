using Mlt.Admin.Api.Models.DTOs;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace Mlt.Admin.Api.Services
{
    public class EmailService : IEmailService
    {
        private readonly ILogger<EmailService> _logger;
        private readonly IConfiguration _configuration;
        private readonly string _smtpHost = "smtp.mailersend.net";
        private readonly int _smtpPort = 587;
        private readonly string _smtpUsername;
        private readonly string _smtpPassword;
        private readonly string _fromEmail;
        private readonly string _fromName;

        public EmailService(ILogger<EmailService> logger, IConfiguration configuration)
        {
            _logger = logger;
            _configuration = configuration;
            
            // Load configuration from environment variables first, then configuration
            _smtpUsername = Environment.GetEnvironmentVariable("MAILERSEND_SMTP_USERNAME") ?? 
                           _configuration.GetValue<string>("MailerSend:SmtpUsername") ?? "";
            _smtpPassword = Environment.GetEnvironmentVariable("MAILERSEND_SMTP_PASSWORD") ?? 
                           _configuration.GetValue<string>("MailerSend:SmtpPassword") ?? "";
            _fromEmail = Environment.GetEnvironmentVariable("MAILERSEND_FROM_EMAIL") ?? 
                        _configuration.GetValue<string>("MailerSend:FromEmail") ?? "noreply@mylittletales.com";
            _fromName = Environment.GetEnvironmentVariable("MAILERSEND_FROM_NAME") ?? 
                       _configuration.GetValue<string>("MailerSend:FromName") ?? "MLT Admin";

            _logger.LogInformation("📧 MailerSend SMTP client initialized");
        }

        public async Task<bool> SendInvitationEmailAsync(EmailTemplateData data)
        {
            try
            {
                var subject = "You're invited to join MLT Admin Dashboard";
                var htmlContent = GenerateInvitationEmailHtml(data);
                var textContent = GenerateInvitationEmailText(data);

                var success = await SendEmailAsync(data.UserEmail, subject, htmlContent, textContent);
                
                if (success)
                {
                    _logger.LogInformation($"✅ Invitation email sent successfully to {data.UserEmail}");
                }
                else
                {
                    _logger.LogError($"❌ Failed to send invitation email to {data.UserEmail}");
                }

                return success;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error sending invitation email to {data.UserEmail}");
                return false;
            }
        }

        public async Task<bool> SendInvitationEmailAsync(string to, string invitationLink, string inviterName, string companyName)
        {
            var data = new EmailTemplateData
            {
                UserName = to.Split('@')[0], // Use the first part of the email as name
                UserEmail = to,
                InviterName = inviterName,
                InvitationLink = invitationLink,
                ExpiryDate = DateTime.UtcNow.AddDays(7).ToString("MMMM dd, yyyy 'at' hh:mm tt"),
                CompanyName = companyName
            };

            return await SendInvitationEmailAsync(data);
        }

        public async Task<bool> SendPasswordResetEmailAsync(string email, string resetLink)
        {
            try
            {
                var subject = "MLT Admin - Password Reset Request";
                var htmlContent = GeneratePasswordResetEmailHtml(email, resetLink);
                var textContent = GeneratePasswordResetEmailText(resetLink);

                return await SendEmailAsync(email, subject, htmlContent, textContent);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error sending password reset email to {email}");
                return false;
            }
        }

        public async Task<bool> SendOTPEmailAsync(string email, string otpCode)
        {
            return await SendOTPEmailAsync(email, otpCode, "Login Verification");
        }
        
        public async Task<bool> SendOTPEmailAsync(string email, string otpCode, string purpose)
        {
            try
            {
                var subject = $"{purpose} Code: {otpCode}";
                var htmlContent = GenerateOTPEmailHtml(otpCode, purpose);
                var textContent = GenerateOTPEmailText(otpCode, purpose);
                
                return await SendEmailAsync(email, subject, htmlContent, textContent);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send OTP email to {Email}", email);
                return false;
            }
        }

        public void ConfigureProvider(string provider, Dictionary<string, string> settings)
        {
            _logger.LogInformation($"📧 Email provider configuration updated: {provider}");
        }

        public async Task<bool> SendEmailAsync(string to, string subject, string htmlContent, string? textContent = null)
        {
            try
            {
                return await SendViaMailerSendSmtp(to, subject, htmlContent, textContent);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to send email to {to}");
                return false;
            }
        }

        public async Task<bool> TestConnectionAsync()
        {
            try
            {
                // Test SMTP connection
                using var client = new SmtpClient();
                await client.ConnectAsync(_smtpHost, _smtpPort, SecureSocketOptions.StartTls);
                await client.AuthenticateAsync(_smtpUsername, _smtpPassword);
                await client.DisconnectAsync(true);
                _logger.LogInformation("✅ MailerSend SMTP connection test successful");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ MailerSend connection test failed");
                return false;
            }
        }

        private async Task<bool> SendViaMailerSendSmtp(string to, string subject, string htmlContent, string? textContent = null)
        {
            try
            {
                var message = new MimeMessage();
                message.From.Add(new MailboxAddress(_fromName, _fromEmail));
                message.To.Add(new MailboxAddress("", to));
                message.Subject = subject;

                var bodyBuilder = new BodyBuilder
                {
                    HtmlBody = htmlContent,
                    TextBody = textContent ?? htmlContent
                };

                message.Body = bodyBuilder.ToMessageBody();

                using var client = new SmtpClient();
                await client.ConnectAsync(_smtpHost, _smtpPort, SecureSocketOptions.StartTls);
                await client.AuthenticateAsync(_smtpUsername, _smtpPassword);
                await client.SendAsync(message);
                await client.DisconnectAsync(true);

                _logger.LogInformation($"✅ Email sent via MailerSend SMTP to {to}");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to send email via MailerSend SMTP to {to}");
                return false;
            }
        }
        
        private string GeneratePasswordResetEmailHtml(string email, string resetLink)
        {
            return $@"
<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
    <h2>Password Reset Request</h2>
    <p>A password reset was requested for your account ({email}).</p>
    <p><a href='{resetLink}' style='background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>Reset Password</a></p>
    <p>If you didn't request this, please ignore this email.</p>
    <p>This link expires in 1 hour.</p>
</div>";
        }

        private string GeneratePasswordResetEmailText(string resetLink)
        {
            return $@"
Password Reset Request

A password reset was requested for your account.

Click the link below to reset your password:
{resetLink}

If you didn't request this, please ignore this email.
This link expires in 1 hour.
            ";
        }

        private string GenerateOTPEmailHtml(string otpCode)
        {
            return GenerateOTPEmailHtml(otpCode, "Login Verification");
        }
        
        private string GenerateOTPEmailHtml(string otpCode, string purpose)
        {
            return $@"
<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; text-align: center;'>
    <h2>Your {purpose} Code</h2>
    <p>Use this code to complete your {purpose.ToLower()}:</p>
    <div style='font-size: 24px; font-weight: bold; background-color: #f0f0f0; padding: 20px; margin: 20px 0; border-radius: 5px;'>
        {otpCode}
    </div>
    <p>This code expires in 5 minutes.</p>
    <p>If you didn't request this code, please ignore this email.</p>
</div>";
        }

        private string GenerateOTPEmailText(string otpCode)
        {
            return GenerateOTPEmailText(otpCode, "Login Verification");
        }
        
        private string GenerateOTPEmailText(string otpCode, string purpose)
        {
            return $@"
Your {purpose} Code

Use this code to complete your {purpose.ToLower()}: {otpCode}

This code expires in 5 minutes.

If you didn't request this code, please ignore this email.
            ";
        }

        private string GenerateInvitationEmailHtml(EmailTemplateData data)
        {
            return $@"
<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
    <h2>You're invited to join {data.CompanyName}</h2>
    <p>Hello {data.UserName},</p>
    <p>{data.InviterName} has invited you to join the MLT Admin Dashboard.</p>
    <p><a href='{data.InvitationLink}' style='background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>Accept Invitation</a></p>
    <p>This invitation expires on {data.ExpiryDate}.</p>
    <p>If you didn't expect this invitation, please ignore this email.</p>
</div>";
        }

        private string GenerateInvitationEmailText(EmailTemplateData data)
        {
            return $@"
You're invited to join {data.CompanyName}

Hello {data.UserName},

{data.InviterName} has invited you to join the MLT Admin Dashboard.

Click the link below to accept the invitation:
{data.InvitationLink}

This invitation expires on {data.ExpiryDate}.

If you didn't expect this invitation, please ignore this email.
            ";
        }
    }
} 