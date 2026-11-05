#!/usr/bin/env sh
# Builds dist/timezone-shift-<version>.zip for upload to the Chrome Web Store.
set -e
cd "$(dirname "$0")/.."
VERSION=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' src/manifest.json | head -1)
mkdir -p dist
OUT="dist/timezone-shift-$VERSION.zip"
rm -f "$OUT"
(cd src && zip -qr "../$OUT" . -x ".*" -x "__MACOSX/*")
echo "Built $OUT"
