@echo off
setlocal enabledelayedexpansion

echo.
echo ===============================================
echo       MLT Admin - Unified Development
echo ===============================================
echo.

REM Find project root
set "PROJECT_ROOT=%~dp0..\.."
cd /d "%PROJECT_ROOT%"

REM Check if directories exist
if not exist "MltAdminApi" (
    echo [ERROR] MltAdminApi directory not found!
    echo Please run from the correct project directory.
    pause
    exit /b 1
)

if not exist "MltAdminWeb" (
    echo [ERROR] MltAdminWeb directory not found!
    echo Please run from the correct project directory.
    pause
    exit /b 1
)

echo [MLT] Project root: %PROJECT_ROOT%
echo [MLT] API directory: %PROJECT_ROOT%\MltAdminApi
echo [MLT] Web directory: %PROJECT_ROOT%\MltAdminWeb
echo.

REM Step 0: Clean up any existing processes on our ports
echo =========================================
echo STEP 0: Cleaning Up Existing Processes
echo =========================================
echo.

echo [MLT] ^> Killing processes on MLT ports...

REM Kill processes on port 5001 (API)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5001') do (
    set pid=%%a
    if defined pid (
        echo [WARNING] Killing process on port 5001 (PID: !pid!)
        taskkill /f /pid !pid! >nul 2>&1
    )
)

REM Kill processes on port 5173 (Frontend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do (
    set pid=%%a
    if defined pid (
        echo [WARNING] Killing process on port 5173 (PID: !pid!)
        taskkill /f /pid !pid! >nul 2>&1
    )
)

REM Kill any dotnet and node processes related to MLT
taskkill /f /im dotnet.exe >nul 2>&1
taskkill /f /im node.exe /fi "WINDOWTITLE eq MLT*" >nul 2>&1

echo [SUCCESS] Port cleanup completed
echo.

REM Step 1: API Project Setup
echo =========================================
echo STEP 1: Setting up .NET API Project
echo =========================================
echo.

echo [MLT] ^> Restoring NuGet packages...
cd MltAdminApi
dotnet restore
if errorlevel 1 (
    echo [ERROR] Failed to restore NuGet packages
    pause
    exit /b 1
)
echo [SUCCESS] NuGet packages restored successfully
echo.

echo [MLT] ^> Building .NET project...
dotnet build
if errorlevel 1 (
    echo [ERROR] Failed to build .NET project
    pause
    exit /b 1
)
echo [SUCCESS] .NET project built successfully
echo.

cd ..

REM Step 2: Web Project Setup
echo ==========================================
echo STEP 2: Setting up React Web Project
echo ==========================================
echo.

echo [MLT] ^> Installing yarn dependencies...
cd MltAdminWeb
call yarn install
if errorlevel 1 (
    echo [ERROR] Failed to install yarn dependencies
    pause
    exit /b 1
)
echo [SUCCESS] Yarn dependencies installed successfully
echo.

echo [MLT] ^> Building React project...
call yarn build
if errorlevel 1 (
    echo [ERROR] Failed to build React project
    pause
    exit /b 1
)
echo [SUCCESS] React project built successfully
echo.

cd ..

REM Step 3: Start Development Servers
echo =========================================
echo STEP 3: Starting Development Servers
echo =========================================
echo.

echo [MLT] ^> Starting .NET API server...
echo [MLT] API will run on: http://localhost:5001
start "MLT Admin API" cmd /k "cd /d %PROJECT_ROOT%\MltAdminApi && dotnet run"

REM Wait for API to start
echo [MLT] Waiting for API server to start...
timeout /t 5 /nobreak > nul

echo.
echo [MLT] ^> Starting React development server...
echo [MLT] Web will run on: http://localhost:5173
start "MLT Admin Web" cmd /k "cd /d %PROJECT_ROOT%\MltAdminWeb && yarn dev"

REM Wait for Web to start
timeout /t 3 /nobreak > nul

echo.
echo ===============================================
echo   MLT Admin Development Environment Ready!
echo ===============================================
echo.
echo [SUCCESS] API Server:  http://localhost:5001
echo [SUCCESS] Web App:     http://localhost:5173
echo [SUCCESS] API Health:  http://localhost:5001/api/health
echo.
echo Tips:
echo   ^> Both servers are running in separate windows
echo   ^> Close both windows to stop the servers
echo   ^> Web app will auto-reload on file changes
echo   ^> API will auto-reload on file changes
echo.
echo Happy coding! Both servers are now running...
echo.
pause 