#!/bin/bash

# MLT Admin API - Stored Procedures Deployment Script
# This script ensures all required database functions are created in production

set -e  # Exit on any error

echo "🚀 Starting Stored Procedures Deployment..."

# Get database connection details from environment
DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_NAME="${DATABASE_NAME:-mlt_admin}"
DB_USER="${DATABASE_USER:-postgres}"
DB_PASSWORD="${DATABASE_PASSWORD:-postgres}"

echo "📊 Database: $DB_HOST:$DB_PORT/$DB_NAME"

# Function to check if PostgreSQL is available
check_postgres() {
    echo "🔍 Checking PostgreSQL connection..."
    if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" > /dev/null 2>&1; then
        echo "❌ PostgreSQL is not available at $DB_HOST:$DB_PORT"
        exit 1
    fi
    echo "✅ PostgreSQL connection successful"
}

# Function to apply stored procedures
apply_stored_procedures() {
    echo "📝 Applying stored procedures..."
    
    # Set password for psql
    export PGPASSWORD="$DB_PASSWORD"
    
    # Apply the comprehensive stored procedures script
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f SQL/all-stored-procedures.sql; then
        echo "✅ Stored procedures applied successfully"
    else
        echo "❌ Failed to apply stored procedures"
        exit 1
    fi
}

# Function to verify stored procedures
verify_stored_procedures() {
    echo "🔍 Verifying stored procedures..."
    
    # List of required functions
    functions=(
        "GetShopifyProductsWithInventory"
        "GetShopifyInventoryCount"
        "GetShopifyProductsWithWindow"
        "GetShopifyProductsByLocation"
        "GetFinanceDashboardSummary"
        "GetSimpleSalesAnalytics"
        "GetTopSellingProducts"
    )
    
    export PGPASSWORD="$DB_PASSWORD"
    
    for func in "${functions[@]}"; do
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT 1 FROM pg_proc WHERE proname = '$func';" | grep -q 1; then
            echo "✅ $func exists"
        else
            echo "❌ $func is missing"
            exit 1
        fi
    done
    
    echo "✅ All stored procedures verified"
}

# Function to run Entity Framework migrations
run_migrations() {
    echo "🔄 Running Entity Framework migrations..."
    
    if dotnet ef database update; then
        echo "✅ Migrations applied successfully"
    else
        echo "❌ Failed to apply migrations"
        exit 1
    fi
}

# Main execution
main() {
    echo "=========================================="
    echo "MLT Admin API - Stored Procedures Deployment"
    echo "=========================================="
    
    check_postgres
    run_migrations
    apply_stored_procedures
    verify_stored_procedures
    
    echo "=========================================="
    echo "🎉 Deployment completed successfully!"
    echo "=========================================="
}

# Run main function
main "$@" 