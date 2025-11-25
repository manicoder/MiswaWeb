#!/bin/bash

echo "Consolidating migrations..."

# Remove old migration files
echo "Removing old migration files..."
rm -f MltAdminApi/Migrations/20250726041214_InitialCreate.cs
rm -f MltAdminApi/Migrations/20250726041214_InitialCreate.Designer.cs
rm -f MltAdminApi/Migrations/20250726064016_AddAllStoredProceduresComprehensive.cs
rm -f MltAdminApi/Migrations/20250726064016_AddAllStoredProceduresComprehensive.Designer.cs
rm -f MltAdminApi/Migrations/20250726070441_AddCOGSAnalyticsStoredProcedures.cs
rm -f MltAdminApi/Migrations/20250726070441_AddCOGSAnalyticsStoredProcedures.Designer.cs
rm -f MltAdminApi/Migrations/20250726071432_FixCOGSStoredProcedures.cs
rm -f MltAdminApi/Migrations/20250726071432_FixCOGSStoredProcedures.Designer.cs
rm -f MltAdminApi/Migrations/20250726071727_FixCOGSPriceFields.cs
rm -f MltAdminApi/Migrations/20250726071727_FixCOGSPriceFields.Designer.cs

echo "Old migration files removed."

# Update the ApplicationDbContextModelSnapshot.cs to reflect the consolidated migration
echo "Updating model snapshot..."
cp MltAdminApi/Migrations/20250726080000_ConsolidatedMigration.Designer.cs MltAdminApi/Migrations/ApplicationDbContextModelSnapshot.cs

echo "Migration consolidation complete!"
echo "You can now run: dotnet ef database update" 