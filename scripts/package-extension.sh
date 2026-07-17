#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
VERSION=$(node -p "require('$ROOT/manifest.json').version")
DIST="$ROOT/dist"
ARCHIVE="$DIST/jlab-logbook-comment-monitor-v$VERSION.zip"

mkdir -p "$DIST"
rm -f "$ARCHIVE" "$ARCHIVE.sha256"
cd "$ROOT"
zip -q "$ARCHIVE" \
  manifest.json background.js popup.html popup.css popup.js \
  monitor-policy.js health.js jlab-parsers.js email.js shift-crew.js \
  icon.png icon.svg README.md CHANGELOG.md

if command -v sha256sum >/dev/null 2>&1; then
  (cd "$DIST" && sha256sum "$(basename "$ARCHIVE")" > "$(basename "$ARCHIVE").sha256")
else
  (cd "$DIST" && shasum -a 256 "$(basename "$ARCHIVE")" > "$(basename "$ARCHIVE").sha256")
fi
printf '%s\n' "$ARCHIVE" "$ARCHIVE.sha256"
