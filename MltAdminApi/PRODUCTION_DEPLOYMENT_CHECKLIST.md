# Production Deployment Checklist for MLT Admin API

## ✅ Pre-Deployment Cleanup (COMPLETED)

### Security & Configuration
- [x] Removed test files (TestCompareAtPrice.cs, TestCostPerItem.cs)
- [x] Removed development artifacts (logs, test HTTP files)
- [x] Removed hardcoded secrets from configuration files
- [x] Set database reset flag to false for production
- [x] Removed Console.WriteLine statements from production code
- [x] Created proper production configuration file
- [x] Updated .gitignore to exclude sensitive files

### Environment Variables Required

Set these environment variables in your production environment:

#### Database Configuration
```bash
DB_HOST=your-production-db-host
DB_NAME=your-production-database-name
DB_USER=your-database-username
DB_PASSWORD=your-database-password
DATABASE_URL=postgres://username:password@host:port/database
```

#### Security Keys
```bash
JWT_KEY=your-production-jwt-secret-key-here
ENCRYPTION_KEY=your-production-encryption-key-here
```

#### Email Configuration
```bash
MAILERSEND_USERNAME=your_actual_mailersend_smtp_username
MAILERSEND_PASSWORD=your_actual_mailersend_smtp_password
```

#### Frontend URL (for CORS)
```bash
FRONTEND_URL=https://your-frontend-domain.com
```

## 🔧 Production Configuration

### 1. Database Setup
- [ ] Ensure PostgreSQL database is created and accessible
- [ ] Run migrations: `dotnet ef database update`
- [ ] Verify database connection string is correct
- [ ] Test database connectivity
- [ ] Deploy stored procedures (see section below)

### 2. Environment Variables
- [ ] Set all required environment variables
- [ ] Verify JWT key is strong and unique
- [ ] Verify encryption key is strong and unique
- [ ] Test email configuration

### 3. Security Hardening
- [ ] Enable HTTPS in production
- [ ] Configure proper CORS origins
- [ ] Set up rate limiting if needed
- [ ] Configure logging levels appropriately
- [ ] Remove any development endpoints

### 4. Monitoring & Logging
- [ ] Set up application monitoring
- [ ] Configure log aggregation
- [ ] Set up health checks
- [ ] Configure error tracking

## 🚀 Deployment Steps

### 1. Build and Test
```bash
# Clean build
dotnet clean
dotnet build --configuration Release

# Run tests (if any)
dotnet test

# Publish for production
dotnet publish --configuration Release --output ./publish
```

### 2. Database Migration
```bash
# Apply migrations
dotnet ef database update
```

### 3. Stored Procedures Deployment
```bash
# Deploy all stored procedures
./deploy-stored-procedures.sh

# Or deploy manually:
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f SQL/FinanceDashboardStoredProcedures.sql
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f SQL/ProductOptimizationStoredProcedures.sql
```

**Required Environment Variables for Stored Procedures:**
```bash
DB_HOST=your-production-db-host
DB_NAME=your-production-database-name
DB_USER=your-database-username
DB_PASSWORD=your-database-password
```

**Verification:**
```bash
# Test finance dashboard function
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT * FROM getfinancedashboardsummary(NULL, NULL, NULL);"

# Test product functions
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT * FROM gettopsellingproducts(10);"
```

### 4. Deploy Application
```bash
# For Railway deployment
railway up

# For Docker deployment
docker build -t mlt-admin-api .
docker run -p 8080:8080 mlt-admin-api
```

## 🔍 Post-Deployment Verification

### 1. Health Checks
- [ ] Test `/api/health` endpoint
- [ ] Verify database connectivity
- [ ] Check application logs

### 2. API Endpoints
- [ ] Test authentication endpoints
- [ ] Verify CORS is working
- [ ] Test Shopify integration
- [ ] Verify email functionality

### 3. Security Verification
- [ ] Confirm HTTPS is enabled
- [ ] Verify JWT authentication works
- [ ] Test CORS restrictions
- [ ] Check for any exposed sensitive data

## 📊 Monitoring Setup

### 1. Application Metrics
- [ ] Set up performance monitoring
- [ ] Configure error tracking
- [ ] Set up uptime monitoring

### 2. Database Monitoring
- [ ] Monitor database performance
- [ ] Set up connection pooling
- [ ] Configure backup strategies

### 3. Log Management
- [ ] Configure structured logging
- [ ] Set up log rotation
- [ ] Configure log aggregation

## 🔒 Security Checklist

### 1. Secrets Management
- [ ] All secrets moved to environment variables
- [ ] No hardcoded credentials in code
- [ ] Secrets properly encrypted in transit
- [ ] Access to secrets is restricted

### 2. Network Security
- [ ] HTTPS enabled and enforced
- [ ] CORS properly configured
- [ ] Rate limiting implemented
- [ ] Firewall rules configured

### 3. Application Security
- [ ] Input validation implemented
- [ ] SQL injection prevention
- [ ] XSS protection enabled
- [ ] CSRF protection configured

## 🚨 Emergency Procedures

### 1. Rollback Plan
- [ ] Document rollback procedures
- [ ] Keep previous version ready
- [ ] Test rollback process

### 2. Incident Response
- [ ] Set up monitoring alerts
- [ ] Document incident response procedures
- [ ] Establish escalation procedures

## 📝 Maintenance

### 1. Regular Tasks
- [ ] Monitor application performance
- [ ] Review and rotate logs
- [ ] Update dependencies regularly
- [ ] Backup database regularly

### 2. Security Updates
- [ ] Keep dependencies updated
- [ ] Monitor security advisories
- [ ] Apply security patches promptly

---

**Last Updated:** $(date)
**Version:** 1.0.0 