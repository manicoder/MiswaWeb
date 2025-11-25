#!/bin/bash

# MLT Admin API - Production Reset Script
# This script completely resets the database for production deployment

set -e  # Exit on any error

echo "🚀 Starting Production Database Reset..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "MltAdminApi.csproj" ]; then
    print_error "Please run this script from the MltAdminApi directory"
    exit 1
fi

# Check if PostgreSQL client is installed
if ! command -v psql &> /dev/null; then
    print_error "PostgreSQL client (psql) is not installed"
    echo "Install with:"
    echo "  Ubuntu/Debian: sudo apt-get install postgresql-client"
    echo "  macOS: brew install postgresql"
    exit 1
fi

# Check required environment variables
required_vars=(
    "DB_HOST"
    "DB_NAME" 
    "DB_USER"
    "DB_PASSWORD"
)

missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    print_error "The following environment variables are required:"
    for var in "${missing_vars[@]}"; do
        echo "  - $var"
    done
    echo ""
    print_status "Set them using:"
    echo "export DB_HOST=your_host"
    echo "export DB_NAME=your_database"
    echo "export DB_USER=your_username"
    echo "export DB_PASSWORD=your_password"
    exit 1
fi

# Test database connection
print_status "Testing database connection..."
if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    print_error "Cannot connect to database. Check your credentials and network connection."
    exit 1
fi

print_status "✅ Database connection successful!"

# STEP 1: Drop all stored procedures and functions
print_step "Step 1: Dropping all stored procedures and functions..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- Drop all functions
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION') LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.routine_name) || ' CASCADE';
    END LOOP;
END $$;
EOF
print_status "✅ All stored procedures and functions dropped"

# STEP 2: Drop all tables
print_step "Step 2: Dropping all tables..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- Drop all tables
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;
EOF
print_status "✅ All tables dropped"

# STEP 3: Drop all sequences
print_step "Step 3: Dropping all sequences..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- Drop all sequences
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS ' || quote_ident(r.sequence_name) || ' CASCADE';
    END LOOP;
END $$;
EOF
print_status "✅ All sequences dropped"

# STEP 4: Drop all views
print_step "Step 4: Dropping all views..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- Drop all views
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT table_name FROM information_schema.views WHERE table_schema = 'public') LOOP
        EXECUTE 'DROP VIEW IF EXISTS ' || quote_ident(r.table_name) || ' CASCADE';
    END LOOP;
END $$;
EOF
print_status "✅ All views dropped"

# STEP 5: Drop all indexes
print_step "Step 5: Dropping all indexes..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- Drop all indexes (except primary keys which are dropped with tables)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND indexname NOT LIKE '%_pkey'
    ) LOOP
        EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident(r.indexname) || ' CASCADE';
    END LOOP;
END $$;
EOF
print_status "✅ All indexes dropped"

# STEP 6: Remove all migrations from __EFMigrationsHistory
print_step "Step 6: Removing migration history..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- Drop migration history table if it exists
DROP TABLE IF EXISTS "__EFMigrationsHistory" CASCADE;
EOF
print_status "✅ Migration history cleared"

# STEP 7: Clean up any remaining objects
print_step "Step 7: Cleaning up remaining objects..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- Drop any remaining objects
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop any remaining functions
    FOR r IN (SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public') LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.routine_name) || ' CASCADE';
    END LOOP;
    
    -- Drop any remaining tables
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;
EOF
print_status "✅ All remaining objects cleaned up"

# STEP 8: Build the application
print_step "Step 8: Building the application..."
dotnet build
if [ $? -ne 0 ]; then
    print_error "Build failed!"
    exit 1
fi
print_status "✅ Application built successfully"

# STEP 9: Remove existing migrations
print_step "Step 9: Removing existing migrations..."
rm -rf Migrations/*
print_status "✅ Existing migrations removed"

# STEP 10: Create new initial migration
print_step "Step 10: Creating new initial migration..."
dotnet ef migrations add InitialCreate
if [ $? -ne 0 ]; then
    print_error "Migration creation failed!"
    exit 1
fi
print_status "✅ New initial migration created"

# STEP 11: Apply migrations to database
print_step "Step 11: Applying migrations to database..."
dotnet ef database update
if [ $? -ne 0 ]; then
    print_error "Database migration failed!"
    exit 1
fi
print_status "✅ Database migrations applied successfully"

# STEP 12: Deploy stored procedures
print_step "Step 12: Deploying stored procedures..."
print_status "Deploying finance dashboard stored procedures..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f SQL/FinanceDashboardStoredProcedures.sql
print_status "✅ Finance dashboard stored procedures deployed"

print_status "Deploying product optimization stored procedures..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f SQL/ProductOptimizationStoredProcedures.sql
print_status "✅ Product optimization stored procedures deployed"

print_status "Deploying sales analytics stored procedures..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f SQL/SalesAnalyticsStoredProcedure.sql
print_status "✅ Sales analytics stored procedures deployed"

# STEP 13: Verify deployment
print_step "Step 13: Verifying deployment..."
table_count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')
function_count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';" | tr -d ' ')

print_status "✅ Database reset completed successfully!"
print_status "📊 Final counts:"
print_status "   - Tables: $table_count"
print_status "   - Functions: $function_count"

# STEP 14: Test key functions
print_step "Step 14: Testing key functions..."
print_status "Testing GetFinanceDashboardSummary..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 'Finance Dashboard Test' as test_name, total_revenue, total_orders FROM getfinancedashboardsummary(NULL, NULL, NULL) LIMIT 1;" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_status "✅ GetFinanceDashboardSummary working"
else
    print_warning "⚠️ GetFinanceDashboardSummary may have issues"
fi

print_status "Testing GetTopSellingProducts..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT * FROM gettopsellingproducts(10) LIMIT 1;" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_status "✅ GetTopSellingProducts working"
else
    print_warning "⚠️ GetTopSellingProducts may have issues"
fi

print_status "🎉 Production database reset completed successfully!"
echo ""
print_status "Your MLT Admin API database is now ready for production!"
echo ""
print_status "Next steps:"
echo "1. Deploy your API application"
echo "2. Test the API endpoints"
echo "3. Monitor performance and logs"
echo "4. Run your application with: dotnet run" 