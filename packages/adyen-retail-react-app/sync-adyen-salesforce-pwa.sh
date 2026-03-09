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
cd $PACKAGE_DIR || { echo -e "${RED}Failed to enter package directory${NC}"; exit 1; }
rm -rf dist
npm run build-prod || { echo -e "${RED}Build failed!${NC}"; exit 1; }

# 2. Pack
echo -e "${BLUE}[2/4] Packaging (npm pack)...${NC}"
TARBALL_NAME=$(npm pack | tail -n 1)
echo -e "${GREEN}Created: $TARBALL_NAME${NC}"

# 3. Move and Install
echo -e "${BLUE}[3/4] Installing in Adyen Retail React App...${NC}"
mv "$TARBALL_NAME" "$APP_DIR/"
cd "$APP_DIR" || exit
npm install "./$TARBALL_NAME" --ignore-scripts --no-save || { echo -e "${RED}Install failed!${NC}"; exit 1; }

# 4. Cleanup
echo -e "${BLUE}[4/4] Cleaning up...${NC}"
rm "./$TARBALL_NAME"

echo -e "${GREEN}✅ Successfully synced $TARBALL_NAME to Adyen Retail React App!${NC}"