#!/bin/bash
# Start script for backend server

cd "$(dirname "$0")"

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found. Creating one with default values..."
    cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=miswa
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
EOF
fi

# Check if dependencies are installed
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo "📦 Installing dependencies..."
    if [ -d "venv" ]; then
        source venv/bin/activate
    fi
    pip install -r requirements.txt
fi

# Start the server
# Use PORT from environment variable (Railway provides this), default to 8000
PORT=${PORT:-8000}
echo "🚀 Starting backend server on http://localhost:${PORT}"
echo "📚 API docs available at http://localhost:${PORT}/docs"
echo ""
uvicorn server:app --reload --host 0.0.0.0 --port $PORT

