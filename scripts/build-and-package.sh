#!/usr/bin/env bash
# ----------------------------------------------------------------------
# Build TestFlow TCM images and package them for sharing (no source).
#
# Output: dist-share/testflow-tcm-<tag>.zip  containing:
#   - testflow-images-<tag>.tar.gz   (backend + frontend Docker images)
#   - docker-compose.prod.yml
#   - .env.production.example
#   - README-RUN.md
#
# Usage:
#   ./scripts/build-and-package.sh              # tag = 1.0.0
#   ./scripts/build-and-package.sh 1.2.3        # custom tag
# ----------------------------------------------------------------------
set -euo pipefail

TAG="${1:-1.0.0}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT_DIR/dist-share"
STAGE_DIR="$OUT_DIR/testflow-tcm-$TAG"

BACKEND_IMAGE="testflow-backend:$TAG"
FRONTEND_IMAGE="testflow-frontend:$TAG"

cyan()  { printf "\033[36m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
red()   { printf "\033[31m%s\033[0m\n" "$*" 1>&2; }

if ! command -v docker >/dev/null 2>&1; then
  red "ERROR: docker is not installed. Install Docker Desktop and retry."
  exit 1
fi

cyan "==> Cleaning previous output"
rm -rf "$OUT_DIR"
mkdir -p "$STAGE_DIR"

cyan "==> Building backend image: $BACKEND_IMAGE"
docker build \
  -t "$BACKEND_IMAGE" \
  -f "$ROOT_DIR/backend/Dockerfile" \
  "$ROOT_DIR/backend"

cyan "==> Building frontend image: $FRONTEND_IMAGE"
docker build \
  -t "$FRONTEND_IMAGE" \
  -f "$ROOT_DIR/frontend/Dockerfile" \
  "$ROOT_DIR/frontend"

cyan "==> Saving images to tarball"
IMAGES_TAR="$STAGE_DIR/testflow-images-$TAG.tar"
docker save -o "$IMAGES_TAR" "$BACKEND_IMAGE" "$FRONTEND_IMAGE"

cyan "==> Compressing images tarball (gzip)"
gzip -f "$IMAGES_TAR"

cyan "==> Copying runtime files"
cp "$ROOT_DIR/docker-compose.prod.yml" "$STAGE_DIR/docker-compose.yml"
cp "$ROOT_DIR/.env.production.example" "$STAGE_DIR/.env.example"
cp "$ROOT_DIR/SHARE.md"                 "$STAGE_DIR/README-RUN.md"

# Stamp the tag into .env.example so the defaults match
sed -i.bak "s/^IMAGE_TAG=.*/IMAGE_TAG=$TAG/" "$STAGE_DIR/.env.example" && rm -f "$STAGE_DIR/.env.example.bak"

cyan "==> Creating zip"
ZIP_FILE="$OUT_DIR/testflow-tcm-$TAG.zip"
( cd "$OUT_DIR" && zip -rq "$(basename "$ZIP_FILE")" "testflow-tcm-$TAG" )

SIZE=$(du -h "$ZIP_FILE" | cut -f1)

echo
green "==================================================="
green "  Package ready!"
green "---------------------------------------------------"
green "  Zip:      $ZIP_FILE  ($SIZE)"
green "  Contents: $STAGE_DIR/"
green "==================================================="
echo
cyan "Send the .zip to your friend. They only need Docker Desktop."
cyan "Run instructions are in the bundled README-RUN.md."
