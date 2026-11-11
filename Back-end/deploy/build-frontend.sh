#!/usr/bin/env bash
# Builds the shop website (Front-end/) from the checked-out code and switches
# the live site to the new build. Runs as the 'laceloft' user, from
# frontend-setup.sh, update.sh, and when the admin's "Publish to website"
# button is pressed (a systemd path unit watches its flag file).
set -euo pipefail

ENV_FILE=/etc/laceloft/env
APP_HOME=/srv/laceloft
APP_DIR="$APP_HOME/app"
OUT="$APP_HOME/frontend"

# Read just the two values we need (not the whole file: it holds secrets).
get() { grep -E "^$1=" "$ENV_FILE" | head -n1 | cut -d= -f2- || true; }
DOMAIN="$(get DOMAIN)"
SHOP_DOMAIN="$(get SHOP_DOMAIN)"
[ -n "$DOMAIN" ] && [ -n "$SHOP_DOMAIN" ] || { echo "DOMAIN / SHOP_DOMAIN missing in $ENV_FILE"; exit 1; }

export HOME="$APP_HOME"
export VITE_API_BASE="https://$DOMAIN/api"
export VITE_SITE_URL="https://$SHOP_DOMAIN"

# One build at a time (the Publish button can be pressed repeatedly).
exec 9> /run/lock/laceloft-frontend-build.lock
flock 9

cd "$APP_DIR/Front-end"

lock_hash="$(sha256sum package-lock.json | cut -d' ' -f1)"
if [ ! -d node_modules ] || [ "$(cat node_modules/.lock-hash 2>/dev/null || true)" != "$lock_hash" ]; then
  echo "==> Installing packages"
  npm ci --no-audit --no-fund --loglevel=error
  echo "$lock_hash" > node_modules/.lock-hash
fi

echo "==> Building the website (talks to $VITE_API_BASE)"
npm run build
test -f dist/index.html

ts="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT/releases/$ts"
cp -a dist/. "$OUT/releases/$ts/"
ln -sfn "$OUT/releases/$ts" "$OUT/current.new"
mv -T "$OUT/current.new" "$OUT/current"

# Keep the last three builds so a bad one can be rolled back by hand.
ls -1dt "$OUT"/releases/* | tail -n +4 | xargs -r rm -rf

echo "Shop website updated: $ts"
