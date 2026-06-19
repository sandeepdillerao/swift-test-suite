#!/usr/bin/env bash
# =============================================================================
# TestFlow TCM — Desktop Release Script
#
# Usage:
#   ./scripts/release.sh                  # interactive: prompts for version bump
#   ./scripts/release.sh patch            # bump patch  1.0.0 → 1.0.1
#   ./scripts/release.sh minor            # bump minor  1.0.0 → 1.1.0
#   ./scripts/release.sh major            # bump major  1.0.0 → 2.0.0
#   ./scripts/release.sh 1.2.3            # set exact version
#   ./scripts/release.sh patch --dry-run  # build only, skip publish & git tag
#
# Environment:
#   GH_TOKEN  GitHub Personal Access Token with "repo" scope (required for publish)
#             Create at: https://github.com/settings/tokens
#
# What this script does:
#   1. Validates prerequisites
#   2. Bumps version in package.json
#   3. Builds backend bundle (ncc)
#   4. Builds renderer + main + preload (electron-vite)
#   5. Packages: macOS → Windows → Linux (with GitHub publish)
#   6. Copies GETTING_STARTED.md to dist/
#   7. Creates and pushes a git tag
#   8. Prints a summary
# =============================================================================

set -euo pipefail

# ─── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

log()     { echo -e "${BLUE}▶${RESET} $*"; }
success() { echo -e "${GREEN}✓${RESET} $*"; }
warn()    { echo -e "${YELLOW}⚠${RESET} $*"; }
error()   { echo -e "${RED}✗${RESET} $*" >&2; }
header()  { echo -e "\n${BOLD}${CYAN}$*${RESET}"; echo -e "${CYAN}$(printf '─%.0s' {1..60})${RESET}"; }

# ─── Parse arguments ─────────────────────────────────────────────────────────
BUMP="${1:-}"
DRY_RUN=false
if [[ "$*" == *"--dry-run"* ]]; then
  DRY_RUN=true
  warn "DRY RUN — builds will be created but NOT published to GitHub and no git tag."
fi

# Script must be run from the electron/ directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ELECTRON_DIR="$(dirname "$SCRIPT_DIR")"
REPO_ROOT="$(dirname "$ELECTRON_DIR")"

cd "$ELECTRON_DIR"

# Load .env if present (contains GH_TOKEN, RELEASE_GH_TOKEN)
if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
  log "Loaded .env"
fi

# ─── Prerequisite checks ─────────────────────────────────────────────────────
header "Checking prerequisites"

# node
if ! command -v node &>/dev/null; then
  error "Node.js not found. Install from https://nodejs.org"; exit 1
fi
success "Node.js $(node --version)"

# npm
if ! command -v npm &>/dev/null; then
  error "npm not found."; exit 1
fi
success "npm $(npm --version)"

# git
if ! command -v git &>/dev/null; then
  error "git not found."; exit 1
fi
success "git $(git --version | awk '{print $3}')"

# GH_TOKEN (required for publishing)
if [[ "$DRY_RUN" == false ]]; then
  if [[ -z "${GH_TOKEN:-}" ]]; then
    error "GH_TOKEN is not set."
    echo ""
    echo "  Create a GitHub token at: https://github.com/settings/tokens"
    echo "  Required scope: repo"
    echo ""
    echo "  Then set it:"
    echo "    export GH_TOKEN=ghp_your_token_here"
    echo "    ./scripts/release.sh $BUMP"
    echo ""
    echo "  Or run a dry build (no publish, no git tag):"
    echo "    ./scripts/release.sh $BUMP --dry-run"
    exit 1
  fi
  success "GH_TOKEN is set (publish)"
fi

# RELEASE_GH_TOKEN — a separate read-only token embedded in the app for
# fetching update metadata from a private GitHub repo.
# Only needed if the repo is private. Scope: "Contents: Read" (classic: repo).
if [[ -n "${RELEASE_GH_TOKEN:-}" ]]; then
  success "RELEASE_GH_TOKEN is set (embedded in app for private-repo updates)"
else
  warn "RELEASE_GH_TOKEN not set — update checks will only work if the repo is public."
  warn "  Set it with: export RELEASE_GH_TOKEN=ghp_readonly_token"
fi

# Fix binary permissions (macOS may lose +x after npm install)
chmod +x node_modules/.bin/electron-vite \
         node_modules/.bin/electron-builder \
         node_modules/.bin/ncc \
         node_modules/app-builder-bin/mac/app-builder_arm64 \
         node_modules/app-builder-bin/mac/app-builder_amd64 2>/dev/null || true

# ─── Version bump ────────────────────────────────────────────────────────────
header "Version"

CURRENT_VERSION=$(node -p "require('./package.json').version")
log "Current version: ${BOLD}${CURRENT_VERSION}${RESET}"

# Prompt if no argument given
if [[ -z "$BUMP" ]] || [[ "$BUMP" == "--dry-run" ]]; then
  echo ""
  echo "  Select version bump:"
  echo "    1) patch  (bug fixes)         $(node -p "require('./package.json').version.split('.').map((v,i)=>i===2?+v+1:+v).join('.')")"
  echo "    2) minor  (new features)      $(node -p "const v=require('./package.json').version.split('.');v[1]=+v[1]+1;v[2]=0;v.join('.')")"
  echo "    3) major  (breaking changes)  $(node -p "const v=require('./package.json').version.split('.');v[0]=+v[0]+1;v[1]=0;v[2]=0;v.join('.')")"
  echo "    4) custom (enter manually)"
  echo ""
  read -rp "  Choice [1-4]: " choice
  case "$choice" in
    1) BUMP="patch" ;;
    2) BUMP="minor" ;;
    3) BUMP="major" ;;
    4) read -rp "  Enter version (e.g. 1.2.3): " BUMP ;;
    *) error "Invalid choice"; exit 1 ;;
  esac
fi

# Calculate new version
case "$BUMP" in
  patch)
    NEW_VERSION=$(node -p "const v=require('./package.json').version.split('.');v[2]=+v[2]+1;v.join('.')")
    ;;
  minor)
    NEW_VERSION=$(node -p "const v=require('./package.json').version.split('.');v[1]=+v[1]+1;v[2]=0;v.join('.')")
    ;;
  major)
    NEW_VERSION=$(node -p "const v=require('./package.json').version.split('.');v[0]=+v[0]+1;v[1]=0;v[2]=0;v.join('.')")
    ;;
  [0-9]*.[0-9]*.[0-9]*)
    NEW_VERSION="$BUMP"
    ;;
  *)
    error "Invalid bump type: '$BUMP'. Use patch / minor / major / x.y.z"
    exit 1
    ;;
esac

success "New version: ${BOLD}${NEW_VERSION}${RESET}"

# ─── Platform selection ───────────────────────────────────────────────────────
echo ""
echo -e "  ${BOLD}Select platforms to build:${RESET}"
echo "    1) All  (macOS + Windows + Linux)  [recommended]"
echo "    2) macOS only"
echo "    3) Windows only"
echo "    4) Linux only"
echo "    5) macOS + Windows"
echo "    6) macOS + Linux"
echo ""
read -rp "  Choice [1-6, default=1]: " platform_choice
platform_choice="${platform_choice:-1}"

case "$platform_choice" in
  1) BUILD_PLATFORMS="all";   PLATFORMS_LABEL="macOS + Windows + Linux" ;;
  2) BUILD_PLATFORMS="mac";   PLATFORMS_LABEL="macOS" ;;
  3) BUILD_PLATFORMS="win";   PLATFORMS_LABEL="Windows" ;;
  4) BUILD_PLATFORMS="linux"; PLATFORMS_LABEL="Linux" ;;
  5) BUILD_PLATFORMS="mac win"; PLATFORMS_LABEL="macOS + Windows" ;;
  6) BUILD_PLATFORMS="mac linux"; PLATFORMS_LABEL="macOS + Linux" ;;
  *) error "Invalid choice"; exit 1 ;;
esac

success "Platforms: ${BOLD}${PLATFORMS_LABEL}${RESET}"
echo ""
read -rp "  Confirm release v${NEW_VERSION} for ${PLATFORMS_LABEL}? [y/N] " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  warn "Aborted."; exit 0
fi

# Update package.json version
node -e "
  const fs = require('fs');
  const p = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  p.version = '${NEW_VERSION}';
  fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n');
"
success "Updated package.json → v${NEW_VERSION}"

# ─── Build backend bundle ─────────────────────────────────────────────────────
header "Step 1/4 — Building backend bundle"
log "Compiling NestJS backend…"
cd "$REPO_ROOT/backend" && npm run build 2>&1 | tail -3
cd "$ELECTRON_DIR"

log "Bundling backend with ncc…"
node_modules/.bin/ncc build ../backend/dist/main.js \
  -o resources/backend -m --no-source-map-register 2>&1 | tail -2
success "Backend bundled → resources/backend/index.js ($(du -sh resources/backend/index.js | cut -f1))"

# ─── Build Electron (renderer + main + preload) ───────────────────────────────
header "Step 2/4 — Building Electron"
log "Running electron-vite build…"
node node_modules/.bin/electron-vite build 2>&1 | grep -E "✓|✗|error" || true
success "Electron built → out/"

# ─── Package installers ───────────────────────────────────────────────────────
header "Step 3/4 — Packaging (${PLATFORMS_LABEL})"

PUBLISH_FLAG=""
if [[ "$DRY_RUN" == false ]]; then
  PUBLISH_FLAG="--publish always"
fi

# electron-builder automatically reads GH_TOKEN from the environment for
# both uploading assets AND embedding into app-update.yml.
# DO NOT override it with --config.publish.token (that would use the wrong token
# for uploads and cause 403 Forbidden).
# The GH_TOKEN is embedded in app-update.yml inside the packaged app so
# electron-updater can authenticate against the private GitHub repo.
TOKEN_FLAG=""  # intentionally empty — GH_TOKEN is used automatically

# Pass GH_TOKEN explicitly to the node process so electron-builder always finds it
# regardless of how the shell was launched (sourced .env, subshell, CI, etc.)
BUILD_CMD="GH_TOKEN=${GH_TOKEN:-} node node_modules/.bin/electron-builder"

build_platform() {
  local flag="$1"
  local label="$2"
  log "Building ${label}…"
  eval "$BUILD_CMD --${flag} $PUBLISH_FLAG $TOKEN_FLAG" 2>&1 | grep -E "packaging|building target|uploading|uploaded|⨯" || true
  success "${label} done"
}

# macOS is always built first when included
if [[ "$BUILD_PLATFORMS" == *"mac"* ]] || [[ "$BUILD_PLATFORMS" == "all" ]]; then
  build_platform "mac" "macOS"
fi
if [[ "$BUILD_PLATFORMS" == *"win"* ]] || [[ "$BUILD_PLATFORMS" == "all" ]]; then
  build_platform "win" "Windows"
fi
if [[ "$BUILD_PLATFORMS" == *"linux"* ]] || [[ "$BUILD_PLATFORMS" == "all" ]]; then
  build_platform "linux" "Linux"
fi

# Copy readme
cp resources/GETTING_STARTED.md dist/GETTING_STARTED.md
success "GETTING_STARTED.md copied to dist/"

# ─── Git tag ─────────────────────────────────────────────────────────────────
if [[ "$DRY_RUN" == false ]]; then
  header "Step 4/4 — Git tag"
  cd "$REPO_ROOT"

  # Stage the version bump
  git add electron/package.json
  git commit -m "chore: release v${NEW_VERSION}" 2>/dev/null || warn "Nothing to commit (version already staged?)"

  TAG="v${NEW_VERSION}"
  if git rev-parse "$TAG" &>/dev/null; then
    warn "Tag $TAG already exists — skipping tag creation"
  else
    git tag -a "$TAG" -m "Release ${TAG}"
    success "Created git tag: $TAG"
  fi

  read -rp "  Push tag to origin? [y/N] " push_confirm
  if [[ "$push_confirm" =~ ^[Yy]$ ]]; then
    git push origin "$TAG"
    success "Pushed tag $TAG to origin"
  else
    warn "Tag not pushed. Push manually: git push origin $TAG"
  fi

  cd "$ELECTRON_DIR"
fi

# ─── Summary ─────────────────────────────────────────────────────────────────
header "Release complete 🎉"

echo ""
echo -e "  ${BOLD}Version:${RESET}   v${NEW_VERSION}"
echo -e "  ${BOLD}Platforms:${RESET} ${PLATFORMS_LABEL}"
echo -e "  ${BOLD}Artifacts:${RESET}"
ls -lh dist/*.dmg dist/*.exe dist/*.AppImage dist/*.deb dist/GETTING_STARTED.md 2>/dev/null \
  | awk '{printf "    %-48s %s\n", $NF, $5}' || true

if [[ "$DRY_RUN" == false ]]; then
  echo ""
  echo -e "  ${BOLD}GitHub Release:${RESET}"
  # Extract owner/repo from electron-builder config
  OWNER=$(node -p "
    const fs=require('fs');
    const txt=fs.readFileSync('electron-builder.json5','utf8');
    const m=txt.match(/owner:\s*[\"']([^\"']+)[\"']/);
    m?m[1]:'your-org'
  " 2>/dev/null)
  REPO=$(node -p "
    const fs=require('fs');
    const txt=fs.readFileSync('electron-builder.json5','utf8');
    const m=txt.match(/repo:\s*[\"']([^\"']+)[\"']/);
    m?m[1]:'testflow-tcm'
  " 2>/dev/null)
  echo -e "  https://github.com/${OWNER}/${REPO}/releases/tag/v${NEW_VERSION}"
  echo ""
  echo -e "  ${YELLOW}If you chose releaseType: 'draft', go to GitHub Releases and publish the draft.${RESET}"
else
  echo ""
  warn "DRY RUN complete — nothing was published to GitHub and no git tag was created."
  echo -e "  Run without --dry-run to publish: ${BOLD}GH_TOKEN=... ./scripts/release.sh ${BUMP}${RESET}"
fi

echo ""
