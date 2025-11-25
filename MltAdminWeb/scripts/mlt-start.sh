#!/bin/bash

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Utility functions
log() {
    echo -e "${BLUE}[MLT]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} ✅ $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} ❌ $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} ⚠️  $1"
}

log_info() {
    echo -e "${CYAN}[INFO]${NC} ℹ️  $1"
}

log_step() {
    echo -e "${MAGENTA}[STEP]${NC} 🚀 $1"
}

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    local service_name=$2
    
    if lsof -ti :$port >/dev/null 2>&1; then
        log_warning "Port $port is in use, killing existing $service_name process..."
        lsof -ti :$port | xargs kill -9 2>/dev/null || true
        sleep 2
        if lsof -ti :$port >/dev/null 2>&1; then
            log_error "Failed to kill process on port $port"
        else
            log_success "Successfully freed port $port"
        fi
    else
        log_info "Port $port is available"
    fi
}

# Function to cleanup all MLT related ports and processes
cleanup_ports() {
    log_step "Cleaning up existing processes on MLT ports..."
    
    # Kill processes on standard MLT ports
    kill_port 5001 "API"
    kill_port 5173 "Frontend"
    kill_port 3000 "Alt Frontend"
    kill_port 8080 "Alt API"
    
    # Kill any dotnet and vite processes
    pkill -f "dotnet run" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    pkill -f "MltAdminApi" 2>/dev/null || true
    
    sleep 1
    log_success "Port cleanup completed"
}

# Function to cleanup background processes
cleanup() {
    echo
    log_warning "Stopping all MLT processes..."
    
    # Kill API server
    if [ ! -z "$API_PID" ]; then
        kill $API_PID 2>/dev/null || true
        log "API server stopped"
    fi
    
    # Kill web app
    if [ ! -z "$WEB_PID" ]; then
        kill $WEB_PID 2>/dev/null || true
        log "Web app stopped"
    fi
    
    # Clean up all ports
    cleanup_ports
    
    log_success "All servers stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

echo
echo "==============================================="
echo "       MLT Admin - Unified Development"
echo "==============================================="
echo

# Find project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Check if directories exist
if [ ! -d "$PROJECT_ROOT/MltAdminApi" ] || [ ! -d "$PROJECT_ROOT/MltAdminWeb" ]; then
    log_error "MltAdminApi or MltAdminWeb directory not found!"
    log_error "Please run from the correct project directory."
    exit 1
fi

log "Project root: $PROJECT_ROOT"
log "API directory: $PROJECT_ROOT/MltAdminApi"
log "Web directory: $PROJECT_ROOT/MltAdminWeb"
echo

# Step 0: Clean up any existing processes on our ports
echo "========================================="
echo "STEP 0: Cleaning Up Existing Processes"
echo "========================================="
echo

cleanup_ports
echo

# Step 1: API Project Setup
echo "========================================="
echo "STEP 1: Setting up .NET API Project"
echo "========================================="
echo

log_step "Restoring NuGet packages..."
cd "$PROJECT_ROOT/MltAdminApi"
if ! dotnet restore; then
    log_error "Failed to restore NuGet packages"
    exit 1
fi
log_success "NuGet packages restored successfully"
echo

log_step "Building .NET project..."
if ! dotnet build; then
    log_error "Failed to build .NET project"
    exit 1
fi
log_success ".NET project built successfully"
echo

# Step 2: Web Project Setup
echo "=========================================="
echo "STEP 2: Setting up React Web Project"
echo "=========================================="
echo

cd "$PROJECT_ROOT/MltAdminWeb"

log_step "Installing yarn dependencies..."
if ! yarn install; then
    log_error "Failed to install yarn dependencies"
    exit 1
fi
log_success "Yarn dependencies installed successfully"
echo

log_step "Building React project..."
if ! yarn build; then
    log_error "Failed to build React project"
    exit 1
fi
log_success "React project built successfully"
echo

# Step 3: Start Development Servers
echo "========================================="
echo "STEP 3: Starting Development Servers"
echo "========================================="
echo

log_step "Starting .NET API server..."
log_info "API will run on: http://localhost:5001"

cd "$PROJECT_ROOT/MltAdminApi"
dotnet run &
API_PID=$!

# Wait for API to start
log "Waiting for API server to start..."
sleep 5

echo
log_step "Starting React development server..."
log_info "Web will run on: http://localhost:5173"

cd "$PROJECT_ROOT/MltAdminWeb"
yarn dev &
WEB_PID=$!

# Wait for Web to start
sleep 3

echo
echo "==============================================="
echo "   MLT Admin Development Environment Ready!"
echo "==============================================="
echo
log_success "API Server:  http://localhost:5001"
log_success "Web App:     http://localhost:5173"
log_success "API Health:  http://localhost:5001/api/health"
echo
log "💡 Tips:"
log "   • Both servers are running in the background"
log "   • Press Ctrl+C to stop all servers"
log "   • Web app will auto-reload on file changes"
log "   • API will auto-reload on file changes"
echo
log "✨ Happy coding! Both servers are now running..."
echo

# Wait for both processes to complete or be interrupted
wait $API_PID $WEB_PID 