#!/bin/bash

# MailerSend Setup Script for Local Development
# This script helps you set up MailerSend credentials using .NET User Secrets

echo "🔧 Setting up MailerSend credentials for local development..."
echo ""

# Check if user secrets are initialized
if ! dotnet user-secrets list > /dev/null 2>&1; then
    echo "📝 Initializing user secrets..."
    dotnet user-secrets init
fi

echo "📧 Please enter your MailerSend credentials:"
echo ""

# Get SMTP Username
read -p "Enter your MailerSend SMTP Username: " smtp_username
if [ -n "$smtp_username" ]; then
    dotnet user-secrets set "MailerSend:SmtpUsername" "$smtp_username"
    echo "✅ SMTP Username set"
else
    echo "⚠️  SMTP Username not provided"
fi

# Get SMTP Password
read -s -p "Enter your MailerSend SMTP Password: " smtp_password
echo ""
if [ -n "$smtp_password" ]; then
    dotnet user-secrets set "MailerSend:SmtpPassword" "$smtp_password"
    echo "✅ SMTP Password set"
else
    echo "⚠️  SMTP Password not provided"
fi

# Get From Email
read -p "Enter your From Email (default: noreply@yourdomain.com): " from_email
if [ -n "$from_email" ]; then
    dotnet user-secrets set "MailerSend:FromEmail" "$from_email"
    echo "✅ From Email set to: $from_email"
else
    dotnet user-secrets set "MailerSend:FromEmail" "noreply@yourdomain.com"
    echo "✅ From Email set to default: noreply@yourdomain.com"
fi

# Get From Name
read -p "Enter your From Name (default: MLT Admin): " from_name
if [ -n "$from_name" ]; then
    dotnet user-secrets set "MailerSend:FromName" "$from_name"
    echo "✅ From Name set to: $from_name"
else
    dotnet user-secrets set "MailerSend:FromName" "MLT Admin"
    echo "✅ From Name set to default: MLT Admin"
fi

echo ""
echo "🎉 MailerSend configuration complete!"
echo ""
echo "📋 Current configuration:"
dotnet user-secrets list | grep MailerSend
echo ""
echo "🧪 To test your configuration:"
echo "1. Start your application: dotnet run"
echo "2. Test the OTP endpoint: POST /api/auth/send-otp"
echo "3. Check the logs for email sending status"
echo ""
echo "📚 For production deployment, see: DEPLOYMENT_VARIABLES.md" 