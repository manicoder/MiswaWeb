# Migration Consolidation

## Overview
This document explains the consolidation of multiple migration files into a single comprehensive migration for the MLT Admin API.

## Problem
The project had multiple migration files that were created incrementally:
- `20250726041214_InitialCreate.cs` - Initial database schema
- `20250726064016_AddAllStoredProceduresComprehensive.cs` - Added stored procedures
- `20250726070441_AddCOGSAnalyticsStoredProcedures.cs` - Added COGS analytics
- `20250726071432_FixCOGSStoredProcedures.cs` - Fixed COGS stored procedures
- `20250726071727_FixCOGSPriceFields.cs` - Fixed COGS price fields

## Solution
Created a single consolidated migration file: `20250726080000_ConsolidatedMigration.cs` that includes:
- All table structures from the initial migration
- All stored procedures from the comprehensive migration
- All COGS analytics functions with the latest fixes
- All indexes and foreign key relationships

## Files Created
1. `MltAdminApi/Migrations/20250726080000_ConsolidatedMigration.cs` - Main migration file
2. `MltAdminApi/Migrations/20250726080000_ConsolidatedMigration.Designer.cs` - Model snapshot
3. `MltAdminApi/update-database-consolidated.sh` - Script to apply the consolidation

## How to Apply

### Option 1: Using the Script (Recommended)
```bash
cd MltAdminApi
./update-database-consolidated.sh
```

### Option 2: Manual Steps
1. Reset the database migration history:
   ```bash
   cd MltAdminApi
   dotnet ef database update 0
   ```

2. Remove old migration files:
   ```bash
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
   ```

3. Update the model snapshot:
   ```bash
   cp Migrations/20250726080000_ConsolidatedMigration.Designer.cs Migrations/ApplicationDbContextModelSnapshot.cs
   ```

4. Apply the consolidated migration:
   ```bash
   dotnet ef database update
   ```

## Benefits
- **Cleaner Migration History**: Single migration instead of multiple incremental ones
- **Easier Deployment**: No need to run multiple migrations in sequence
- **Better Maintainability**: All database changes in one place
- **Reduced Complexity**: Eliminates potential migration conflicts

## What's Included
The consolidated migration includes:
- All user management tables (Users, UserPermissions, StoreConnections, etc.)
- All finance tables (Expenses, ExpenseCategories, ChartOfAccounts, etc.)
- All order management tables (Jobs, OrderStatuses, etc.)
- All warehouse and inventory tables
- All stored procedures and functions
- All indexes and foreign key relationships
- All COGS analytics functions with latest fixes

## Verification
After applying the migration, verify that:
1. All tables exist in the database
2. All stored procedures are created
3. All indexes are properly created
4. The application starts without errors
5. All existing functionality works as expected

## Rollback
If you need to rollback, you can:
1. Drop the database completely
2. Remove the consolidated migration files
3. Recreate the database from scratch

## Notes
- This consolidation is designed for fresh deployments
- If you have existing data, make sure to backup before applying
- The consolidated migration assumes a clean database state
- All stored procedures are included with their latest fixes 