#!/bin/bash
# Packages ishaara_tools/ into a fresh ishaara_tools.zip for Blender installation.

cd "$(dirname "$0")"

rm -f ishaara_tools.zip
zip -r ishaara_tools.zip ishaara_tools/

echo "✅ ishaara_tools.zip is ready — install via Blender > Preferences > Add-ons > Install"
