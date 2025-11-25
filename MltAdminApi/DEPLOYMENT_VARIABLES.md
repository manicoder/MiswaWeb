# Production Environment Variables Setup

This guide shows how to set MailerSend environment variables on different hosting platforms.

## Required Environment Variables

```bash
MAILERSEND_SMTP_USERNAME=your_smtp_username
MAILERSEND_SMTP_PASSWORD=your_smtp_password
MAILERSEND_FROM_EMAIL=noreply@yourdomain.com
MAILERSEND_FROM_NAME=MLT Admin
```

## Platform-Specific Instructions

### 1. Railway

If you're using Railway, set these in your Railway dashboard:

```bash
# Via Railway CLI
railway variables set MAILERSEND_SMTP_USERNAME=your_smtp_username
railway variables set MAILERSEND_SMTP_PASSWORD=your_smtp_password
railway variables set MAILERSEND_FROM_EMAIL=noreply@yourdomain.com
railway variables set MAILERSEND_FROM_NAME=MLT Admin

# Or via Railway dashboard:
# 1. Go to your project in Railway
# 2. Click on your service
# 3. Go to "Variables" tab
# 4. Add each variable with its value
```

### 2. Heroku

```bash
# Via Heroku CLI
heroku config:set MAILERSEND_SMTP_USERNAME=your_smtp_username
heroku config:set MAILERSEND_SMTP_PASSWORD=your_smtp_password
heroku config:set MAILERSEND_FROM_EMAIL=noreply@yourdomain.com
heroku config:set MAILERSEND_FROM_NAME="MLT Admin"

# Or via Heroku dashboard:
# 1. Go to your app in Heroku
# 2. Go to "Settings" tab
# 3. Click "Reveal Config Vars"
# 4. Add each variable
```

### 3. Azure App Service

```bash
# Via Azure CLI
az webapp config appsettings set --name your-app-name --resource-group your-resource-group --settings MAILERSEND_SMTP_USERNAME=your_smtp_username
az webapp config appsettings set --name your-app-name --resource-group your-resource-group --settings MAILERSEND_SMTP_PASSWORD=your_smtp_password
az webapp config appsettings set --name your-app-name --resource-group your-resource-group --settings MAILERSEND_FROM_EMAIL=noreply@yourdomain.com
az webapp config appsettings set --name your-app-name --resource-group your-resource-group --settings MAILERSEND_FROM_NAME="MLT Admin"

# Or via Azure Portal:
# 1. Go to your App Service
# 2. Go to "Configuration" → "Application settings"
# 3. Add each variable
```

### 4. AWS Elastic Beanstalk

```bash
# Via AWS CLI
aws elasticbeanstalk update-environment \
  --environment-name your-env-name \
  --option-settings Namespace=aws:elasticbeanstalk:application:environment,OptionName=MAILERSEND_SMTP_USERNAME,Value=your_smtp_username

aws elasticbeanstalk update-environment \
  --environment-name your-env-name \
  --option-settings Namespace=aws:elasticbeanstalk:application:environment,OptionName=MAILERSEND_SMTP_PASSWORD,Value=your_smtp_password

aws elasticbeanstalk update-environment \
  --environment-name your-env-name \
  --option-settings Namespace=aws:elasticbeanstalk:application:environment,OptionName=MAILERSEND_FROM_EMAIL,Value=noreply@yourdomain.com

aws elasticbeanstalk update-environment \
  --environment-name your-env-name \
  --option-settings Namespace=aws:elasticbeanstalk:application:environment,OptionName=MAILERSEND_FROM_NAME,Value="MLT Admin"
```

### 5. Docker

```bash
# Docker run command
docker run -e MAILERSEND_SMTP_USERNAME=your_smtp_username \
           -e MAILERSEND_SMTP_PASSWORD=your_smtp_password \
           -e MAILERSEND_FROM_EMAIL=noreply@yourdomain.com \
           -e MAILERSEND_FROM_NAME="MLT Admin" \
           your-app-image

# Docker Compose
# Add to your docker-compose.yml:
environment:
  - MAILERSEND_SMTP_USERNAME=your_smtp_username
  - MAILERSEND_SMTP_PASSWORD=your_smtp_password
  - MAILERSEND_FROM_EMAIL=noreply@yourdomain.com
  - MAILERSEND_FROM_NAME=MLT Admin
```

### 6. Kubernetes

```yaml
# In your deployment.yaml:
env:
- name: MAILERSEND_SMTP_USERNAME
  value: "your_smtp_username"
- name: MAILERSEND_SMTP_PASSWORD
  value: "your_smtp_password"
- name: MAILERSEND_FROM_EMAIL
  value: "noreply@yourdomain.com"
- name: MAILERSEND_FROM_NAME
  value: "MLT Admin"

# Or using secrets:
env:
- name: MAILERSEND_SMTP_USERNAME
  valueFrom:
    secretKeyRef:
      name: mailersend-secrets
      key: smtp-username
- name: MAILERSEND_SMTP_PASSWORD
  valueFrom:
    secretKeyRef:
      name: mailersend-secrets
      key: smtp-password
```

## Testing Your Configuration

After setting the variables, test your email functionality:

1. **Test the OTP endpoint:**
   ```bash
   curl -X POST https://your-api-url/api/auth/send-otp \
        -H "Content-Type: application/json" \
        -d '{"email": "test@example.com"}'
   ```

2. **Check application logs** for email sending success/failure

3. **Verify email delivery** by checking the recipient's inbox

## Security Notes

- ✅ **Use environment variables** instead of hardcoding in config files
- ✅ **Rotate credentials** regularly
- ✅ **Use secrets management** in Kubernetes/Docker
- ❌ **Never commit** real credentials to Git
- ❌ **Don't log** sensitive credentials

## Troubleshooting

If emails aren't sending:

1. **Check logs** for authentication errors
2. **Verify MailerSend credentials** are correct
3. **Ensure domain is verified** in MailerSend
4. **Check rate limits** in your MailerSend account
5. **Test SMTP connection** using the `TestConnectionAsync()` method 