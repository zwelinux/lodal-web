#!/bin/bash
# Builds the zip files for the stores into extension/dist. Run from anywhere:  bash web/extension/package.sh
set -e
cd "$(dirname "$0")"
rm -rf dist && mkdir dist
FILES="manifest.json config.js content.js popup.html popup.css popup.js icons"
# Chrome, Edge, Brave (Chrome Web Store and Microsoft Edge Add-ons take the same file)
zip -qr dist/lodal-chrome.zip $FILES
# Firefox needs an add-on id in the manifest
mkdir -p dist/ff && cp -R $FILES dist/ff/
python3 - <<'PY'
import json
m = json.load(open("dist/ff/manifest.json"))
m["browser_specific_settings"] = {"gecko": {"id": "lodal@yatyarzar.com", "strict_min_version": "115.0", "data_collection_permissions": {"required": ["authenticationInfo", "websiteContent"]}}}
json.dump(m, open("dist/ff/manifest.json", "w"), indent=2)
PY
(cd dist/ff && zip -qr ../lodal-firefox.zip .)
rm -rf dist/ff
# the website serves the Chrome one for "load unpacked" installs
cp dist/lodal-chrome.zip ../public/lodal-extension.zip
echo "Built:"; ls -la dist/*.zip
