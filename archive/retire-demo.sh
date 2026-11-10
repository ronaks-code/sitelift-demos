#!/bin/sh
# Take a demo offline: zip it into archive/dead-leads/, remove the live folder, log it.
# usage: archive/retire-demo.sh <industry>/<state>/<slug> "reason"
# The live URL then returns the 404 page. Commit and push to make it take effect.
set -eu
cd "$(dirname "$0")/.."
path="${1%/}"; reason="${2:-no reason given}"
[ -d "$path" ] || { echo "no demo folder: $path" >&2; exit 1; }
zip_name="archive/dead-leads/$(echo "$path" | tr '/' '__').zip"
zip -qr "$zip_name" "$path"
git rm -rq "$path"
git add "$zip_name"
log=archive/dead-leads/README.md
[ -f "$log" ] || printf '# Retired demos\n\nDemos taken offline because the lead is dead. Each zip holds the folder as it was; unzip at the repo root to restore it.\n\n| Date | Demo | Reason | Zip |\n|---|---|---|---|\n' > "$log"
printf '| %s | %s | %s | %s |\n' "$(date +%F)" "$path" "$reason" "$(basename "$zip_name")" >> "$log"
git add "$log"
echo "retired $path -> $zip_name"
