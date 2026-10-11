#!/bin/bash
# Beatzucker production deploy script — run on the server from /opt/beatzucker.
#
#   cd /opt/beatzucker && ./deploy/deploy.sh
#
# Pulls the latest main, builds a new image, swaps the running container,
# smoke-tests it, and automatically rolls back to the previous image if
# the smoke test fails. Requires passwordless sudo for docker (already
# configured on this host).

set -uo pipefail

APP_DIR="/opt/beatzucker"
IMAGE="beatzucker:latest"
CONTAINER="beatzucker"
ROLLBACK_TAG="beatzucker:pre-deploy-$(date +%Y%m%d_%H%M%S)"
KEEP_BACKUPS=3   # wie viele pre-deploy-Images pro Projekt aufbewahrt werden

cd "$APP_DIR" || { echo "FATAL: $APP_DIR not found"; exit 1; }

# Alte pre-deploy-Backup-Images und ungenutzten Build-Cache aufraeumen. Ohne
# das haeuft sich pro Deploy ein weiteres ~2.7GB-Image an (nichts loescht die
# von selbst) plus wachsender BuildKit-Cache — beides zusammen hat die
# Festplatte des Servers zuletzt auf 81% Auslastung gebracht (54.9GB Cache +
# 21 alte Backup-Images). Laeuft am Ende jedes Deploys, egal ob erfolgreich
# oder mit Rollback, damit sich das nicht wieder anhaeuft.
cleanup_old_images() {
  local repo="${IMAGE%%:*}"
  echo "=== Cleanup: behalte die $KEEP_BACKUPS neuesten '$repo:pre-deploy-*' Images ==="
  local old_tags
  old_tags=$(sudo docker images "$repo" --format '{{.Tag}}|{{.CreatedAt}}' \
    | grep 'pre-deploy-' \
    | sort -t'|' -k2 -r \
    | tail -n "+$((KEEP_BACKUPS + 1))" \
    | cut -d'|' -f1)
  if [ -n "$old_tags" ]; then
    while IFS= read -r tag; do
      sudo docker rmi "$repo:$tag" > /dev/null 2>&1 && echo "  entfernt: $repo:$tag"
    done <<< "$old_tags"
  else
    echo "  nichts zu entfernen"
  fi
  # Nur wirklich alten Cache raeumen (nicht -a): frische Layer bleiben nutzbar,
  # damit der naechste Build von hier profitiert statt komplett neu zu bauen.
  sudo docker builder prune -f --filter "until=48h" > /dev/null 2>&1 || true
}

echo "=== 1. Checking working tree ==="
if [ -n "$(git status --porcelain)" ]; then
  echo "FATAL: working tree has local changes; deployment stopped without changing files."
  git status --short
  exit 1
fi
if [ "$(git branch --show-current)" != "main" ]; then
  echo "FATAL: expected branch main; deployment stopped without changing files."
  exit 1
fi

echo "=== 2. Fetching + fast-forwarding to origin/main ==="
git fetch origin || { echo "FATAL: git fetch failed; running deployment remains unchanged."; exit 1; }
git merge --ff-only origin/main || { echo "FATAL: fast-forward failed; running deployment remains unchanged."; exit 1; }
NEW_SHA=$(git rev-parse --short HEAD)
echo "Now at commit $NEW_SHA"
for rollback_file in check-schema.cjs start.sh; do
  if [ ! -r "$APP_DIR/deploy/rollback-tools/$rollback_file" ]; then
    echo "FATAL: rollback helper $rollback_file missing; running site remains unchanged."
    exit 1
  fi
done

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
  cleanup_old_images
  exit 1
fi

echo "=== 5. Swapping container ==="
SMOKE_CONTAINER="beatzucker-dsp-smoke-${NEW_SHA}-$$"
echo "=== Checking DSP in isolated new image before replacing the running site ==="
if ! timeout 180s sudo docker run --rm --name "$SMOKE_CONTAINER" \
  --network none --cpus=1 --memory=2g --entrypoint python \
  "$IMAGE" /app/python/self_test.py; then
  # Exact, uniquely named test container only; no production volumes attached.
  sudo docker rm -f "$SMOKE_CONTAINER" >/dev/null 2>&1 || true
  echo "FATAL: new image failed DSP self-test. Running site remains unchanged."
  cleanup_old_images
  exit 1
fi
sudo docker stop "$CONTAINER" 2>/dev/null || true
sudo docker rm "$CONTAINER" 2>/dev/null || true
sudo docker run -d \
  --name "$CONTAINER" \
  --restart unless-stopped \
  -p 127.0.0.1:3001:3000 \
  --env-file "$APP_DIR/.env" \
  -v "$APP_DIR/uploads:/app/uploads" \
  -v "$APP_DIR/data:/app/data" \
  "$IMAGE"

echo "=== 6. Waiting for startup ==="
for attempt in $(seq 1 45); do
  if curl -fsS --max-time 3 "http://localhost:3001/api/health" > /dev/null 2>&1; then
    echo "Database and Python service ready."
    break
  fi
  sleep 2
done

echo "=== 7. Smoke test ==="
if bash "$APP_DIR/deploy/smoketest.sh" "http://localhost:3001"; then
  echo "=== Deploy of $NEW_SHA succeeded. ==="
  cleanup_old_images
  exit 0
fi

echo "=== Smoke test FAILED — rolling back ==="
if [ -n "$ROLLBACK_TAG" ]; then
  sudo docker stop "$CONTAINER" 2>/dev/null || true
  sudo docker rm "$CONTAINER" 2>/dev/null || true
  sudo docker run -d \
    --name "$CONTAINER" \
    --restart unless-stopped \
    -p 127.0.0.1:3001:3000 \
    --env-file "$APP_DIR/.env" \
    -v "$APP_DIR/uploads:/app/uploads" \
    -v "$APP_DIR/data:/app/data" \
    --mount "type=bind,source=$APP_DIR/deploy/rollback-tools,target=/app/rollback-tools,readonly" \
    --entrypoint /bin/sh \
    "$ROLLBACK_TAG" /app/rollback-tools/start.sh
  sleep 10
  # Current rollback images support DB/Python readiness; do not hide a broken DSP service.
  if bash "$APP_DIR/deploy/smoketest.sh" "http://localhost:3001"; then
    echo "Rollback to previous image succeeded. Deploy of $NEW_SHA was aborted."
  else
    echo "FATAL: rollback also failed smoke test — manual intervention required!"
  fi
else
  echo "FATAL: no rollback image available — manual intervention required!"
fi
# Auch nach einem Rollback aufraeumen: der ROLLBACK_TAG ist gerade erst
# getaggt worden und damit garantiert unter den neuesten $KEEP_BACKUPS.
cleanup_old_images
exit 1
