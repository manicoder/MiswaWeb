#!/bin/bash

echo "🚀 Production Deployment Script"
echo "================================"

# Check if DATABASE_URL is provided
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is required"
    echo "Example: export DATABASE_URL='postgresql://user:password@host:port/database'"
    exit 1
fi

echo "📦 Building the application..."
dotnet build --configuration Release

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"

echo "🗄️ Running database migrations..."
cd MltAdminApi
dotnet ef database update

if [ $? -ne 0 ]; then
    echo "❌ Database migration failed!"
    exit 1
fi

echo "✅ Database migrations completed!"

echo "📦 Deploying stored procedures..."
cd SQL

# Deploy comprehensive stored procedures
echo "📦 Deploying comprehensive stored procedures..."
psql "$DATABASE_URL" -f comprehensive-stored-procedures.sql

# Deploy COGS analytics
echo "📦 Deploying COGS analytics..."
psql "$DATABASE_URL" -f GetCostOfGoodsSold.sql

# Deploy finance dashboard procedures
echo "📦 Deploying finance dashboard procedures..."
psql "$DATABASE_URL" -f FinanceDashboardStoredProcedures.sql

# Deploy product optimization procedures
echo "📦 Deploying product optimization procedures..."
psql "$DATABASE_URL" -f ProductOptimizationStoredProcedures.sql

# Deploy top selling products
echo "📦 Deploying top selling products..."
psql "$DATABASE_URL" -f deploy-top-selling-products.sql

cd ..

echo "✅ All stored procedures deployed!"

echo "🧪 Testing the application..."
dotnet test --no-build

if [ $? -ne 0 ]; then
    echo "❌ Tests failed!"
    exit 1
fi

echo "✅ Tests passed!"

echo ""
echo "🎉 Production Deployment Complete!"
echo ""
echo "📋 Deployment Summary:"
echo "  ✅ Application built successfully"
echo "  ✅ Database migrations applied"
echo "  ✅ All stored procedures deployed"
echo "  ✅ Tests passed"
echo ""
echo "🚀 Your application is ready for production!"
echo ""
echo "Next steps:"
echo "1. Start the application: dotnet run --configuration Release"
echo "2. Monitor the application logs"
echo "3. Set up monitoring and alerting"
echo "4. Configure backup strategies" 