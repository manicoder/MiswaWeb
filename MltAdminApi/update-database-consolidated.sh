#!/bin/bash

echo "Updating database with consolidated migration..."

# Navigate to the API directory
cd MltAdminApi

# Remove the migration history from the database
echo "Removing migration history from database..."
dotnet ef database update 0

# Remove old migration files
echo "Removing old migration files..."
rm -f Migrations/20250726041214_InitialCreate.cs
rm -f Migrations/20250726041214_InitialCreate.Designer.cs
rm -f Migrations/20250726064016_AddAllStoredProceduresComprehensive.cs
rm -f Migrations/20250726064016_AddAllStoredProceduresComprehensive.Designer.cs
rm -f Migrations/20250726070441_AddCOGSAnalyticsStoredProcedures.cs
rm -f Migrations/20250726070441_AddCOGSAnalyticsStoredProcedures.Designer.cs
rm -f Migrations/20250726071432_FixCOGSStoredProcedures.cs
rm -f Migrations/20250726071432_FixCOGSStoredProcedures.Designer.cs
rm -f Migrations/20250726071727_FixCOGSPriceFields.cs
rm -f Migrations/20250726071727_FixCOGSPriceFields.Designer.cs

# Update the model snapshot
echo "Updating model snapshot..."
cp Migrations/20250726080000_ConsolidatedMigration.Designer.cs Migrations/ApplicationDbContextModelSnapshot.cs

# Apply the consolidated migration
echo "Applying consolidated migration..."
dotnet ef database update

echo "Database updated successfully with consolidated migration!" 