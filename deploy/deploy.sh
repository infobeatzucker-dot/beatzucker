#!/bin/bash
# UpMaDo production deploy script — run on the server from /opt/upmado.
#
#   cd /opt/upmado && ./deploy/deploy.sh
#
# Pulls the latest main, builds a new image, swaps the running container,
# smoke-tests it, and automatically rolls back to the previous image if
# the smoke test fails. Requires passwordless sudo for docker (already
# configured on this host).

set -uo pipefail

APP_DIR="/opt/upmado"
IMAGE="upmado:latest"
CONTAINER="upmado"
ROLLBACK_TAG="upmado:pre-deploy-$(date +%Y%m%d_%H%M%S)"

cd "$APP_DIR" || { echo "FATAL: $APP_DIR not found"; exit 1; }

echo "=== 1. Checking working tree ==="
if [ -n "$(git status --porcelain)" ]; then
  echo "WARNING: working tree has uncommitted changes — resetting to origin/main."
fi

echo "=== 2. Fetching + resetting to origin/main ==="
git fetch origin
git reset --hard origin/main
NEW_SHA=$(git rev-parse --short HEAD)
echo "Now at commit $NEW_SHA"

echo "=== 3. Tagging current image as rollback point ($ROLLBACK_TAG) ==="
if sudo docker image inspect "$IMAGE" > /dev/null 2>&1; then
  sudo docker tag "$IMAGE" "$ROLLBACK_TAG"
else
  echo "No existing $IMAGE to tag — first deploy?"
  ROLLBACK_TAG=""
fi

echo "=== 4. Building new image ==="
if ! sudo docker build -t "$IMAGE" .; then
  echo "FATAL: docker build failed. Nothing was changed on the running container."
  exit 1
fi

echo "=== 5. Swapping container ==="
sudo docker stop "$CONTAINER" 2>/dev/null || true
sudo docker rm "$CONTAINER" 2>/dev/null || true
sudo docker run -d \
  --name "$CONTAINER" \
  --restart unless-stopped \
  -p 0.0.0.0:3000:3000 \
  --env-file "$APP_DIR/.env" \
  -v "$APP_DIR/uploads:/app/uploads" \
  -v "$APP_DIR/data:/app/data" \
  "$IMAGE"

echo "=== 6. Waiting for startup ==="
sleep 15

echo "=== 7. Smoke test ==="
if bash "$APP_DIR/deploy/smoketest.sh" "http://localhost:3000"; then
  echo "=== Deploy of $NEW_SHA succeeded. ==="
  exit 0
fi

echo "=== Smoke test FAILED — rolling back ==="
if [ -n "$ROLLBACK_TAG" ]; then
  sudo docker stop "$CONTAINER" 2>/dev/null || true
  sudo docker rm "$CONTAINER" 2>/dev/null || true
  sudo docker run -d \
    --name "$CONTAINER" \
    --restart unless-stopped \
    -p 0.0.0.0:3000:3000 \
    --env-file "$APP_DIR/.env" \
    -v "$APP_DIR/uploads:/app/uploads" \
    -v "$APP_DIR/data:/app/data" \
    "$ROLLBACK_TAG"
  sleep 10
  if bash "$APP_DIR/deploy/smoketest.sh" "http://localhost:3000"; then
    echo "Rollback to previous image succeeded. Deploy of $NEW_SHA was aborted."
  else
    echo "FATAL: rollback also failed smoke test — manual intervention required!"
  fi
else
  echo "FATAL: no rollback image available — manual intervention required!"
fi
exit 1
