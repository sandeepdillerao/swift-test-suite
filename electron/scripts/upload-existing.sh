#!/usr/bin/env bash
# Upload built artifacts to an EXISTING GitHub release.
# Use this when you have already built dist/ but forgot to set GH_TOKEN,
# or when you want to re-upload without rebuilding from scratch.
#
# Usage:  bash scripts/upload-existing.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ELECTRON_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ELECTRON_DIR"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; RESET='\033[0m'
log()     { echo -e "${BLUE}▶${RESET} $*"; }
success() { echo -e "${GREEN}✓${RESET} $*"; }
warn()    { echo -e "${YELLOW}⚠${RESET} $*"; }
error()   { echo -e "${RED}✗${RESET} $*" >&2; }

# Load .env
if [[ -f ".env" ]]; then
  set -a; source .env; set +a
  log "Loaded .env"
fi

if [[ -z "${GH_TOKEN:-}" ]]; then
  error "GH_TOKEN is not set."
  echo ""
  echo "  1. Create a classic token at: https://github.com/settings/tokens"
  echo "     Scope: repo (full)"
  echo "  2. Add it to electron/.env:"
  echo "     GH_TOKEN=ghp_your_token_here"
  echo "  3. Re-run this script"
  exit 1
fi

VERSION=$(node -p "require('./package.json').version")
log "Uploading artifacts for v${VERSION}…"

chmod +x node_modules/.bin/electron-builder node_modules/app-builder-bin/mac/app-builder_arm64 2>/dev/null || true

# GH_TOKEN must be explicitly passed so electron-builder finds it in all environments
GH_TOKEN="${GH_TOKEN:-}" node node_modules/.bin/electron-builder --publish always 2>&1 \
  | grep -E "packaging|building|uploading|Publishing|⨯|✓" || true

success "Done! Check: https://github.com/sandeepdillerao/swift-test-suite/releases/tag/v${VERSION}"
