#!/bin/bash

# Configuration
PACKAGE_DIR="../adyen-salesforce-pwa"
APP_DIR=$(pwd)

# Colors for logging
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}--- Starting @adyen/adyen-salesforce-pwa Package Update ---${NC}"

# 1. Build
echo -e "${BLUE}[1/4] Building adyen-salesforce-pwa Package...${NC}"
cd "$PACKAGE_DIR" || { echo -e "${RED}Failed to enter package directory${NC}"; exit 1; }
rm -rf dist
# Build and pack installed dependencies without pnpm's implicit dependency install.
npm run build-prod || { echo -e "${RED}Build failed!${NC}"; exit 1; }

# 2. Pack
echo -e "${BLUE}[2/4] Packaging (npm pack)...${NC}"
TARBALL_NAME=$(npm pack --quiet) || { echo -e "${RED}Packaging failed!${NC}"; exit 1; }
echo -e "${GREEN}Created: $TARBALL_NAME${NC}"

# 3. Move and Install (extract into node_modules without changing package.json)
echo -e "${BLUE}[3/4] Installing in Adyen Retail React App...${NC}"
mv "$TARBALL_NAME" "$APP_DIR/"
cd "$APP_DIR" || exit
TARGET_DIR="$APP_DIR/node_modules/@adyen/adyen-salesforce-pwa"
rm -rf "$TARGET_DIR"
mkdir -p "$TARGET_DIR"
# npm/pnpm tarballs wrap contents in a top-level "package/" directory
tar -xzf "./$TARBALL_NAME" -C "$TARGET_DIR" --strip-components=1 || { echo -e "${RED}Install failed!${NC}"; exit 1; }
# Match package-manager installation: declared bin targets must be executable.
node - "$TARGET_DIR" <<'NODE'
const fs = require('node:fs')
const path = require('node:path')
const target = process.argv[2]
const {bin} = require(path.join(target, 'package.json'))
const commands = typeof bin === 'string' ? [bin] : Object.values(bin || {})
for (const command of commands) {
    const file = path.join(target, command)
    fs.chmodSync(file, fs.statSync(file).mode | 0o111)
}
NODE
if [ "$?" -ne 0 ]; then
    echo -e "${RED}Failed to make package commands executable!${NC}"
    exit 1
fi

# 4. Cleanup
echo -e "${BLUE}[4/4] Cleaning up...${NC}"
rm "./$TARBALL_NAME"

echo -e "${GREEN}✅ Successfully synced $TARBALL_NAME to Adyen Retail React App!${NC}"