#!/bin/bash

echo "🚀 Updating MLT Admin API Database..."

# Navigate to the API directory
cd "$(dirname "$0")"

echo "📦 Building the application..."
dotnet build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "🗄️  Applying database migrations..."
dotnet ef database update

if [ $? -ne 0 ]; then
    echo "❌ Database migration failed!"
    exit 1
fi

echo "✅ Database updated successfully!"
echo "🌱 Seed data will be applied when the application starts."

echo "🚀 Starting the API server..."
dotnet run 