#!/bin/bash

# MLT Admin API Production Deployment Script
# This script helps deploy the API to production

set -e  # Exit on any error

echo "🚀 Starting MLT Admin API Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "MltAdminApi.csproj" ]; then
    print_error "Please run this script from the MltAdminApi directory"
    exit 1
fi

# Check if .NET is installed
if ! command -v dotnet &> /dev/null; then
    print_error ".NET SDK is not installed. Please install .NET 8.0 SDK"
    exit 1
fi

print_status "Checking .NET version..."
dotnet --version

# Clean previous builds
print_status "Cleaning previous builds..."
dotnet clean

# Restore dependencies
print_status "Restoring dependencies..."
dotnet restore

# Build the application
print_status "Building application in Release mode..."
dotnet build --configuration Release --no-restore

# Run tests if they exist
if [ -d "Tests" ] || [ -f "*.Tests.csproj" ]; then
    print_status "Running tests..."
    dotnet test --configuration Release --no-build
else
    print_warning "No tests found, skipping test execution"
fi

# Publish the application
print_status "Publishing application..."
dotnet publish --configuration Release --output ./publish --no-build

# Check if publish was successful
if [ ! -d "./publish" ]; then
    print_error "Publish failed. Check the build output above."
    exit 1
fi

print_status "Application published successfully to ./publish directory"

# Check for required environment variables
print_status "Checking environment variables..."

required_vars=(
    "DB_HOST"
    "DB_NAME" 
    "DB_USER"
    "DB_PASSWORD"
    "JWT_KEY"
    "ENCRYPTION_KEY"
    "MAILERSEND_USERNAME"
    "MAILERSEND_PASSWORD"
)

missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    print_warning "The following environment variables are not set:"
    for var in "${missing_vars[@]}"; do
        echo "  - $var"
    done
    echo ""
    print_warning "Please set these variables before deploying to production"
    echo ""
    print_status "You can set them using:"
    echo "export $var=your_value"
    echo ""
fi

# Database migration check
print_status "Checking database migrations..."
if command -v dotnet-ef &> /dev/null; then
    print_status "Entity Framework tools found"
    print_warning "Remember to run 'dotnet ef database update' in production"
else
    print_warning "Entity Framework tools not found. Install with:"
    echo "dotnet tool install --global dotnet-ef"
fi

# Stored Procedures Deployment
print_status "Deploying stored procedures..."
if command -v psql &> /dev/null; then
    print_status "PostgreSQL client found"
    
    # Check if we can connect to the database
    if [ -n "$DB_HOST" ] && [ -n "$DB_NAME" ] && [ -n "$DB_USER" ] && [ -n "$DB_PASSWORD" ]; then
        print_status "Deploying finance dashboard stored procedures..."
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f SQL/FinanceDashboardStoredProcedures.sql
        
        print_status "Deploying product optimization stored procedures..."
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f SQL/ProductOptimizationStoredProcedures.sql
        
        print_status "✅ All stored procedures deployed successfully!"
    else
        print_warning "Database credentials not set. Stored procedures will need to be deployed manually:"
        echo "PGPASSWORD=your_password psql -h your_host -U your_user -d your_db -f SQL/FinanceDashboardStoredProcedures.sql"
        echo "PGPASSWORD=your_password psql -h your_host -U your_user -d your_db -f SQL/ProductOptimizationStoredProcedures.sql"
    fi
else
    print_warning "PostgreSQL client not found. Install with:"
    echo "sudo apt-get install postgresql-client  # Ubuntu/Debian"
    echo "brew install postgresql                 # macOS"
    echo ""
    print_warning "Stored procedures will need to be deployed manually"
fi

# Docker build check
if command -v docker &> /dev/null; then
    print_status "Docker found. You can build a Docker image with:"
    echo "docker build -t mlt-admin-api ."
    echo "docker run -p 8080:8080 mlt-admin-api"
else
    print_warning "Docker not found. Install Docker for containerized deployment"
fi

# Railway deployment check
if command -v railway &> /dev/null; then
    print_status "Railway CLI found. Deploy with:"
    echo "railway up"
else
    print_warning "Railway CLI not found. Install with:"
    echo "npm install -g @railway/cli"
fi

print_status "Deployment preparation completed!"
echo ""
print_status "Next steps:"
echo "1. Set all required environment variables"
echo "2. Deploy to your chosen platform (Railway, Docker, etc.)"
echo "3. Run database migrations: dotnet ef database update"
echo "4. Test the application endpoints"
echo "5. Monitor the application logs"

echo ""
print_status "For detailed instructions, see PRODUCTION_DEPLOYMENT_CHECKLIST.md" 