#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

// Utility functions
const log = (message, color = 'white') => {
  console.log(`${colors[color]}${colors.bright}[MLT]${colors.reset} ${colors[color]}${message}${colors.reset}`);
};

const logSuccess = (message) => log(`✅ ${message}`, 'green');
const logError = (message) => log(`❌ ${message}`, 'red');
const logWarning = (message) => log(`⚠️  ${message}`, 'yellow');
const logInfo = (message) => log(`ℹ️  ${message}`, 'blue');
const logStep = (message) => log(`🚀 ${message}`, 'cyan');

// Check if we're on Windows
const isWindows = os.platform() === 'win32';

// Function to kill processes on specific ports
const killPort = (port, serviceName) => {
  return new Promise((resolve) => {
    const command = isWindows 
      ? `netstat -ano | findstr :${port}`
      : `lsof -ti :${port}`;
    
    exec(command, (error, stdout) => {
      if (!stdout.trim()) {
        logInfo(`Port ${port} is available`);
        resolve();
        return;
      }
      
      logWarning(`Port ${port} is in use, killing existing ${serviceName} process...`);
      
      let killCommand;
      if (isWindows) {
        // Extract PID from netstat output (last column)
        const lines = stdout.trim().split('\n');
        const pids = lines.map(line => {
          const parts = line.trim().split(/\s+/);
          return parts[parts.length - 1];
        }).filter(pid => pid && pid !== '0');
        
        if (pids.length > 0) {
          killCommand = `taskkill /f /pid ${pids.join(' /pid ')}`;
        }
      } else {
        const pids = stdout.trim().split('\n').filter(pid => pid);
        if (pids.length > 0) {
          killCommand = `kill -9 ${pids.join(' ')}`;
        }
      }
      
      if (killCommand) {
        exec(killCommand, (killError) => {
          if (killError) {
            logError(`Failed to kill process on port ${port}: ${killError.message}`);
          } else {
            logSuccess(`Successfully freed port ${port}`);
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  });
};

// Function to cleanup all MLT related ports and processes
const cleanupPorts = async () => {
  logStep('Cleaning up existing processes on MLT ports...');
  
  // Kill processes on standard MLT ports
  await killPort(5001, 'API');
  await killPort(5173, 'Frontend');
  await killPort(8080, 'Alt API');
  
  // Kill any dotnet and vite processes
  const additionalCleanup = isWindows
    ? 'taskkill /f /im dotnet.exe & taskkill /f /im node.exe'
    : 'pkill -f "dotnet run" ; pkill -f "vite" ; pkill -f "MltAdminApi"';
  
  exec(additionalCleanup, () => {
    logSuccess('Port cleanup completed');
  });
  
  // Wait a moment for cleanup to complete
  await new Promise(resolve => setTimeout(resolve, 2000));
};

// Find project root directory
const findProjectRoot = () => {
  let currentDir = process.cwd();
  
  // If we're already in MltAdminApi, go up one level
  if (currentDir.endsWith('MltAdminApi')) {
    currentDir = path.dirname(currentDir);
  }
  
  // If we're in MltAdminWeb, go up one level
  if (currentDir.endsWith('MltAdminWeb')) {
    currentDir = path.dirname(currentDir);
  }
  
  // Check if we have both directories
  const apiDir = path.join(currentDir, 'MltAdminApi');
  const webDir = path.join(currentDir, 'MltAdminWeb');
  
  if (fs.existsSync(apiDir) && fs.existsSync(webDir)) {
    return currentDir;
  }
  
  logError('Could not find project root. Please run from MLT_ADMIN_NEW, MltAdminApi, or MltAdminWeb directory');
  process.exit(1);
};

// Execute command with proper error handling
const execCommand = (command, cwd, description) => {
  return new Promise((resolve, reject) => {
    logStep(description);
    logInfo(`Running: ${command}`);
    logInfo(`Directory: ${cwd}`);
    
    const child = spawn(command, [], {
      shell: true,
      cwd,
      stdio: 'inherit'
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        logSuccess(`${description} completed successfully`);
        resolve();
      } else {
        logError(`${description} failed with exit code ${code}`);
        reject(new Error(`Command failed: ${command}`));
      }
    });
    
    child.on('error', (error) => {
      logError(`${description} failed: ${error.message}`);
      reject(error);
    });
  });
};

// Execute command and continue (for background processes)
const execCommandBackground = (command, cwd, description) => {
  return new Promise((resolve) => {
    logStep(description);
    logInfo(`Running: ${command}`);
    logInfo(`Directory: ${cwd}`);
    
    const child = spawn(command, [], {
      shell: true,
      cwd,
      stdio: 'inherit',
      detached: !isWindows
    });
    
    // Store PID for cleanup
    process.mltProcesses = process.mltProcesses || [];
    process.mltProcesses.push(child);
    
    // Don't wait for background processes
    setTimeout(() => {
      logSuccess(`${description} started in background`);
      resolve();
    }, 2000);
  });
};

// Cleanup function
const cleanup = () => {
  logWarning('Stopping all MLT processes...');
  
  if (process.mltProcesses) {
    process.mltProcesses.forEach(child => {
      try {
        if (isWindows) {
          exec(`taskkill /f /t /pid ${child.pid}`, () => {});
        } else {
          process.kill(-child.pid, 'SIGTERM');
        }
      } catch (e) {
        // Ignore errors during cleanup
      }
    });
  }
  
  // Use our comprehensive cleanup function
  cleanupPorts().then(() => {
    logSuccess('All processes stopped');
    process.exit(0);
  }).catch(() => {
    logSuccess('All processes stopped');
    process.exit(0);
  });
};

// Handle process termination
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

// Main execution function
const main = async () => {
  try {
    log('🚀 MLT Admin - Unified Development Environment Starter', 'magenta');
    log('═══════════════════════════════════════════════════════════', 'magenta');
    console.log();
    
    const projectRoot = findProjectRoot();
    const apiDir = path.join(projectRoot, 'MltAdminApi');
    const webDir = path.join(projectRoot, 'MltAdminWeb');
    
    logInfo(`Project root: ${projectRoot}`);
    logInfo(`API directory: ${apiDir}`);
    logInfo(`Web directory: ${webDir}`);
    console.log();
    
    // Step 0: Clean up any existing processes on our ports
    log('STEP 0: Cleaning Up Existing Processes', 'yellow');
    log('═══════════════════════════════════════════', 'yellow');
    
    await cleanupPorts();
    console.log();
    
    // Step 1: API Project Setup
    log('STEP 1: Setting up .NET API Project', 'yellow');
    log('═══════════════════════════════════════', 'yellow');
    
    await execCommand('dotnet restore', apiDir, 'Restoring NuGet packages');
    await execCommand('dotnet build', apiDir, 'Building .NET project');
    
    console.log();
    
    // Step 2: Web Project Setup
    log('STEP 2: Setting up React Web Project', 'yellow');
    log('════════════════════════════════════════', 'yellow');
    
    await execCommand('yarn install', webDir, 'Installing yarn dependencies');
    await execCommand('yarn build', webDir, 'Building React project');
    
    console.log();
    
    // Step 3: Start Development Servers
    log('STEP 3: Starting Development Servers', 'yellow');
    log('═══════════════════════════════════════', 'yellow');
    
    // Start API server
    logStep('Starting .NET API server...');
    execCommandBackground('dotnet run', apiDir, 'API Server');
    
    // Wait a bit for API to start
    await new Promise(resolve => setTimeout(resolve, 5001));
    
    // Start Web server
    logStep('Starting React development server...');
    execCommandBackground('yarn dev', webDir, 'Web Development Server');
    
    // Wait a bit for Web server to start
    
    console.log();
    log('🎉 MLT Admin Development Environment is Ready!', 'green');
    log('═══════════════════════════════════════════════════', 'green');
    console.log();
    logSuccess('API Server:  http://localhost:5001');
    logSuccess('Web App:     http://localhost:5173');
    logSuccess('API Health:  http://localhost:5001/api/health');
    console.log();
    log('💡 Tips:', 'cyan');
    log('   • Both servers are running in the background', 'cyan');
    log('   • Press Ctrl+C to stop all servers', 'cyan');
    log('   • Web app will auto-reload on file changes', 'cyan');
    log('   • API will auto-reload on file changes', 'cyan');
    console.log();
    log('✨ Happy coding! Both servers will keep running...', 'magenta');
    
    // Keep the process alive
    await new Promise(() => {}); // Infinite promise
    
  } catch (error) {
    logError(`Setup failed: ${error.message}`);
    process.exit(1);
  }
};

// Run the main function
main(); 