#!/bin/bash
# Pull-based deploy for HomeMatch: runs the newest version that passed the Deploy workflow.
# Started by systemd (homematch-deploy.timer) as root.
set -euo pipefail

REPO="velislavdmtrv7/homematch"
DIR="/opt/homematch"
HEALTH_URL="https://homematch-demo.duckdns.org/api/health"
FILES="docker-compose.yml docker-compose.prod.yml nginx/prod.conf"

cd "$DIR"

# 1. Which version should run: the newest successful Deploy run on main
RUNS_URL="https://api.github.com/repos/$REPO/actions/workflows/deploy.yml/runs?branch=main&event=push&status=success&per_page=1"
new=$(curl -fsS "$RUNS_URL" | jq -r '.workflow_runs[0].head_sha // empty')
if [ -z "$new" ]; then
  echo "No successful Deploy run yet"
  exit 0
fi
if ! [[ "$new" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Unexpected SHA from GitHub: $new" >&2
  exit 1
fi

# 2. Which version runs now
current=$(grep '^IMAGE_TAG=' .env | cut -d= -f2)
if [ "$new" = "$current" ]; then
  exit 0
fi
# A version that already failed is not retried; the fix is a new commit (new SHA)
if [ -f .failed-sha ] && [ "$new" = "$(cat .failed-sha)" ]; then
  exit 0
fi
echo "Deploying $new (running: $current)"

# 3. Keep the current state so we can go back
for f in $FILES; do cp -p "$f" "$f.prev"; done
cp -p .env .env.prev

rollback() {
  echo "Deploy of $new failed, rolling back to $current" >&2
  echo "$new" > .failed-sha
  for f in $FILES; do mv "$f.prev" "$f"; done
  mv .env.prev .env
  docker compose up -d
  exit 1
}
trap rollback ERR

# 4. Files and image tag of the new version
for f in $FILES; do
  curl -fsS -o "$f" "https://raw.githubusercontent.com/$REPO/$new/$f"
done
sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=$new/" .env

# 5. Pull only our images (mongo is updated on purpose, not by every deploy) and start
docker compose pull api web
docker compose up -d

# 6. Health check through the real path: DNS, TLS, nginx, api, mongo (up to 60 s)
for _ in $(seq 1 12); do
  if curl -fsS --max-time 5 "$HEALTH_URL" > /dev/null; then
    trap - ERR
    rm -f .failed-sha
    echo "Deployed $new"
    docker image prune -af > /dev/null
    exit 0
  fi
  sleep 5
done

rollback