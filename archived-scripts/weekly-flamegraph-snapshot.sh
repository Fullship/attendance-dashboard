#!/bin/bash
# weekly-flamegraph-snapshot.sh
# Run Clinic 0x for 60 seconds, save output to ./flamegraphs/YYYY-MM-DD_0x.html

set -euo pipefail

DATE=$(date +"%Y-%m-%d")
DEST="$(dirname "$0")/../flamegraphs"
OUTFILE="$DEST/${DATE}_0x.html"

mkdir -p "$DEST"

# Start Clinic 0x in background, kill after 60s, then move the output
clinic 0x --dest="$DEST" -- node cluster-server.js &
CLINIC_PID=$!
sleep 60
kill $CLINIC_PID || true

# Find the latest 0x.html and move/rename it
LATEST=$(ls -t "$DEST"/*.html | head -n1)
if [ -f "$LATEST" ]; then
    mv "$LATEST" "$OUTFILE"
    echo "Flamegraph snapshot saved: $OUTFILE"
else
    echo "No flamegraph output found!"
    exit 1
fi
