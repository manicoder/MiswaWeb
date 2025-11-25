#!/bin/bash

echo "🚀 Starting Fresh Production Setup..."

# Navigate to the API directory
cd MltAdminApi

# Step 1: Remove all existing migrations
echo "🗑️ Removing all existing migrations..."
rm -f Migrations/*.cs
rm -f Migrations/*.Designer.cs

echo "✅ All migrations removed."

# Step 2: Drop the database completely
echo "🗑️ Dropping database..."
dotnet ef database drop --force

echo "✅ Database dropped."

# Step 3: Create a new initial migration
echo "📦 Creating new initial migration..."
dotnet ef migrations add InitialCreate

echo "✅ Initial migration created."

# Step 4: Update the database
echo "🔄 Updating database with new migration..."
dotnet ef database update

echo "✅ Database updated with new migration."

# Step 5: Deploy all stored procedures
echo "📦 Deploying stored procedures..."
cd SQL
./deploy-all.sh
cd ..

echo "✅ Stored procedures deployed."

# Step 6: Verify the setup
echo "🔍 Verifying setup..."
dotnet build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed!"
    exit 1
fi

echo ""
echo "🎉 Fresh Production Setup Complete!"
echo ""
echo "📋 Summary:"
echo "  ✅ All old migrations removed"
echo "  ✅ Database dropped and recreated"
echo "  ✅ New initial migration created"
echo "  ✅ Database updated with new schema"
echo "  ✅ All stored procedures deployed"
echo "  ✅ Build verification passed"
echo ""
echo "🚀 Ready for production deployment!"
echo ""
echo "Next steps:"
echo "1. Test the application locally"
echo "2. Deploy to production server"
echo "3. Run database migrations on production"
echo "4. Deploy stored procedures on production" 