# MLT Admin - Development Scripts

This directory contains scripts to easily start the MLT Admin development environment.

## Quick Start

### Option 1: Using Yarn (Recommended)

From the **MltAdminApi** directory:

```bash
yarn mlt
```

From the **MltAdminWeb** directory:

```bash
yarn mlt
```

### Option 2: Direct Script Execution

**Cross-platform (Node.js):**

```bash
node MltAdminWeb/scripts/mlt-start.js
```

**Windows:**

```bash
MltAdminWeb/scripts/mlt-start.bat
```

**Mac/Linux:**

```bash
./MltAdminWeb/scripts/mlt-start.sh
```

## What It Does

The MLT script performs the following steps:

### Step 0: Port Cleanup (NEW!)

- **🔥 Automatic Port Cleanup** - Kills any existing processes on ports 5001, 5173, 3000, 8080
- **Process Termination** - Stops lingering `dotnet run`, `vite`, and `MltAdminApi` processes
- **Prevents Port Conflicts** - Ensures clean startup without "address already in use" errors

### Step 1: .NET API Project Setup

- `dotnet restore` - Restores NuGet packages
- `dotnet build` - Builds the .NET project
- `dotnet run` - Starts the API server

### Step 2: React Web Project Setup

- `yarn install` - Installs dependencies
- `yarn build` - Builds the React project
- `yarn dev` - Starts the development server

### Step 3: Development Environment

- API Server: http://localhost:5001
- Web App: http://localhost:5173
- API Health Check: http://localhost:5001/api/health

## Features

✅ **Cross-platform compatibility** - Works on Windows, Mac, and Linux  
✅ **Automatic project detection** - Finds project directories automatically  
✅ **Error handling** - Stops execution if any step fails  
✅ **Process cleanup** - Properly stops all servers with Ctrl+C  
✅ **Beautiful logging** - Color-coded output with emojis  
✅ **Background processes** - Both servers run simultaneously  
✅ **Auto-reload** - Both servers support hot reloading  
🔥 **Port cleanup** - Automatically kills existing processes on MLT ports  
🔥 **Conflict prevention** - No more "address already in use" errors

## Script Options

### mlt-start.js (Node.js)

- Cross-platform Node.js script
- Requires Node.js 18+
- Best for automated environments

### mlt-start.bat (Windows)

- Native Windows batch file
- Opens separate command windows
- Good for Windows-only environments

### mlt-start.sh (Mac/Linux)

- Native shell script
- Runs in background processes
- Good for Unix-based systems

## Troubleshooting

### Port Already in Use ✅ SOLVED!

The script **automatically cleans up** all processes using MLT ports:

- **Port 5001** (API Server)
- **Port 5173** (Frontend Dev Server)
- **Port 8080** (Alternative API)

**No more manual port killing needed!** The script handles this automatically.

### Dependencies Missing

Make sure you have:

- .NET 8.0 SDK
- Node.js 18+
- Yarn package manager

### Project Structure

Ensure your project structure is:

```
MLT_ADMIN_NEW/
├── MltAdminApi/
│   ├── package.json
│   └── MltAdminApi.csproj
└── MltAdminWeb/
    ├── package.json
    └── scripts/
        ├── mlt-start.js
        ├── mlt-start.bat
        └── mlt-start.sh
```

## Contributing

To modify the scripts:

1. Edit the main logic in `mlt-start.js`
2. Update platform-specific scripts as needed
3. Test on multiple platforms
4. Update this README

## Legacy Scripts

The following legacy scripts are still available:

- `start-dev.bat` / `start-dev.sh` - Original development scripts
- `start-servers.bat` / `start-servers.sh` - Server startup scripts

The new `mlt-start.*` scripts are recommended for new usage.
