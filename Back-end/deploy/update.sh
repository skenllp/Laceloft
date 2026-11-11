#!/usr/bin/env bash
# Laceloft backend: install the latest code from GitHub on the server.
#
#   bash /srv/laceloft/app/Back-end/deploy/update.sh
#
# Keeps the database and every photo (including ones uploaded in /admin/).
set -euo pipefail

BRANCH="${BRANCH:-main}"
APP_USER=laceloft
APP_HOME=/srv/laceloft
APP_DIR="$APP_HOME/app"
VENV="$APP_HOME/venv"
ENV_FILE=/etc/laceloft/env

say() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }

[ "$(id -u)" -eq 0 ] || exec sudo bash "$0" "$@"
[ -f "$ENV_FILE" ] || { echo "Run setup.sh first."; exit 1; }
cd /tmp

djm() {
  (
    set -a
    # shellcheck disable=SC1090
    . "$ENV_FILE"
    set +a
    cd "$APP_DIR/Back-end"
    export HOME="$APP_HOME"
    exec runuser -u "$APP_USER" -- "$VENV/bin/python" manage.py "$@"
  )
}

say "Backing up before the update"
/usr/local/bin/laceloft-backup || echo "(backup skipped)"

say "Downloading the latest code"
runuser -u "$APP_USER" -- git -C "$APP_DIR" fetch --depth 1 origin "$BRANCH"
runuser -u "$APP_USER" -- git -C "$APP_DIR" reset --hard FETCH_HEAD
runuser -u "$APP_USER" -- git -C "$APP_DIR" log --oneline -1

say "Updating Python packages"
runuser -u "$APP_USER" -- "$VENV/bin/pip" install --quiet -r "$APP_DIR/Back-end/requirements.txt"

say "Updating the database, styles, products and photos"
djm migrate --no-input
djm collectstatic --no-input
djm seed_products
djm make_thumbs

say "Restarting"
systemctl restart laceloft
sleep 3
systemctl is-active laceloft
echo "Done."
