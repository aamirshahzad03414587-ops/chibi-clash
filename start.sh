#!/bin/sh
# Serve Chibi Clash locally so TikTok LIVE Studio can add it as a Link source
# and the page can reach TikFinity at ws://127.0.0.1:21213/
cd "$(dirname "$0")"
PORT="${PORT:-8080}"
echo "Chibi Clash → http://127.0.0.1:${PORT}/"
echo "On stream, use: http://127.0.0.1:${PORT}/?overlay=1"
python3 -m http.server "$PORT"
