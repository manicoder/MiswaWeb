#!/bin/bash

# Deploy All SQL Stored Procedures
# This script deploys all stored procedures in the correct order

set -e

echo "🚀 Deploying All SQL Stored Procedures..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "📝 Using default database connection..."
    DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mlt_admin_dev"
fi

# Deploy in order
echo "📦 Deploying Finance Dashboard Stored Procedures..."
psql "$DATABASE_URL" -f FinanceDashboardStoredProcedures.sql

echo "📦 Deploying Product Optimization Stored Procedures..."
psql "$DATABASE_URL" -f ProductOptimizationStoredProcedures.sql

echo "📦 Deploying Top Selling Products Stored Procedure..."
psql "$DATABASE_URL" -f deploy-top-selling-products.sql

echo "📦 Running Finance Stored Procedures..."
psql "$DATABASE_URL" -f run-finance-stored-procedures.sql

echo "📦 Running Top Selling Products..."
psql "$DATABASE_URL" -f run-top-selling-products.sql

# Test the deployments
echo "🧪 Testing Top Selling Products..."
psql "$DATABASE_URL" -f test-top-selling-products.sql

echo "✅ All SQL stored procedures deployed successfully!"
echo "📊 All optimizations are now active and ready to use." 