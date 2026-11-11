#!/bin/bash
# CinePlay Launcher Script

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

PORT=5055
URL="http://localhost:${PORT}"

echo "=========================================="
echo "🎬 Starting CinePlay Movie Player..."
echo "=========================================="

# Check if port is already running
if lsof -Pi :${PORT} -sTCP:LISTEN -t >/dev/null ; then
    echo "⚡ CinePlay server is already running on port ${PORT}."
else
    echo "🚀 Launching backend streaming engine..."
    python3 app.py &
    SERVER_PID=$!
    
    # Wait for server to be responsive
    for i in {1..30}; do
        if curl -s "${URL}/api/movies" >/dev/null 2>&1; then
            echo "✅ Server is online at ${URL}"
            break
        fi
        sleep 0.2
    done
fi

echo "🎥 Opening Movie Player..."

# Prefer Google Chrome in desktop --app mode for native app experience
if [ -d "/Applications/Google Chrome.app" ]; then
    echo "✨ Launching in dedicated Cinema App Window..."
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --app="${URL}" >/dev/null 2>&1 &
else
    echo "🌐 Opening in default browser..."
    open "${URL}"
fi

echo ""
echo "=========================================="
echo "🍿 CinePlay is running!"
echo "   URL: ${URL}"
echo "   Audio Tracks: Multi-Language (Hindi, Tamil, Telugu, Malayalam, Kannada)"
echo "   Subtitles: Embedded & External (.srt / .vtt supported)"
echo "   Press Ctrl+C to stop the player server."
echo "=========================================="

# If we started the server in this script, wait for user interrupt to clean up
if [ ! -z "$SERVER_PID" ]; then
    trap "echo '🛑 Stopping CinePlay...'; kill $SERVER_PID 2>/dev/null; exit 0" SIGINT SIGTERM
    wait $SERVER_PID
fi
