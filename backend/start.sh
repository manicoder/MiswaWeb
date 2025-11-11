#!/bin/bash
# Start script for backend server

cd "$(dirname "$0")"

# Find a working Python 3 interpreter
if command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
    PYTHON_BIN="python"
else
    echo "❌ Python is not installed. Please install Python 3 (e.g., via Homebrew: brew install python)."
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "🧪 Creating virtual environment..."
    "$PYTHON_BIN" -m venv venv || { echo "❌ Failed to create virtual environment."; exit 1; }
fi

# Use venv python and pip
VENV_PY="venv/bin/python"
VENV_PIP="$VENV_PY -m pip"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found. Creating one with default values..."
    cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=miswa
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
EOF
fi

# Upgrade pip and install dependencies
echo "📦 Ensuring dependencies are installed..."
$VENV_PIP install --upgrade pip >/dev/null 2>&1
$VENV_PIP install -r requirements.txt || { echo "❌ Failed to install dependencies."; exit 1; }

# Start the server
# Use PORT from environment variable (Railway provides this), default to 8000
PORT=${PORT:-8000}
echo "🚀 Starting backend server on http://localhost:${PORT}"
echo "📚 API docs available at http://localhost:${PORT}/docs"
echo ""
"$VENV_PY" -m uvicorn server:app --reload --host 0.0.0.0 --port $PORT

