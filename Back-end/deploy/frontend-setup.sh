#!/usr/bin/env bash
# Hosts the shop website (the React frontend) on this server, next to the backend.
#
#   bash frontend-setup.sh
#
# Run it after setup.sh. Safe to run again. Run it once more after you point
# the shop's domain at this server: that is when HTTPS is issued for it.
set -euo pipefail

APP_USER=laceloft
APP_HOME=/srv/laceloft
APP_DIR="$APP_HOME/app"
FRONT="$APP_HOME/frontend"
ENV_FILE=/etc/laceloft/env
STATE_DIR=/var/lib/laceloft/state
NODE_MAJOR="${NODE_MAJOR:-22}"

say() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m%s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Run this as root."
[ -f "$ENV_FILE" ] || die "Run setup.sh first (it creates $ENV_FILE)."
cd /tmp

get() { grep -E "^$1=" "$ENV_FILE" | head -n1 | cut -d= -f2- || true; }
set_env() {
  local k="$1" v="$2"
  if grep -qE "^$k=" "$ENV_FILE"; then sed -i "s|^$k=.*|$k=$v|" "$ENV_FILE"; else echo "$k=$v" >> "$ENV_FILE"; fi
}

SHOP_DOMAIN="${SHOP_DOMAIN:-$(get SHOP_DOMAIN)}"
if [ -z "$SHOP_DOMAIN" ]; then
  read -r -p "Shop website address (no https://, no www) [laceloft.in]: " SHOP_DOMAIN </dev/tty || true
  SHOP_DOMAIN="${SHOP_DOMAIN:-laceloft.in}"
fi
[[ "$SHOP_DOMAIN" =~ ^[A-Za-z0-9.-]+$ ]] || die "That web address does not look right: $SHOP_DOMAIN"
API_DOMAIN="$(get DOMAIN)"
EMAIL="$(get LETSENCRYPT_EMAIL)"
[ -n "$API_DOMAIN" ] && [ -n "$EMAIL" ] || die "$ENV_FILE is missing DOMAIN or LETSENCRYPT_EMAIL; run setup.sh again."

say "Saving the settings"
cors="$(get CORS_ALLOWED_ORIGINS)"
for o in "https://$SHOP_DOMAIN" "https://www.$SHOP_DOMAIN"; do
  case ",$cors," in *",$o,"*) ;; *) cors="$cors,$o" ;; esac
done
set_env SHOP_DOMAIN "$SHOP_DOMAIN"
set_env FRONTEND_URL "https://$SHOP_DOMAIN"
set_env FRONTEND_REBUILD_FLAG "$STATE_DIR/rebuild.flag"
set_env CORS_ALLOWED_ORIGINS "${cors#,}"

say "Installing Node.js $NODE_MAJOR (official build, checksum verified)"
have=""
if command -v node >/dev/null 2>&1; then have="$(node -p 'process.versions.node.split(".")[0]')"; fi
if [ "$have" != "$NODE_MAJOR" ]; then
  apt-get install -y xz-utils >/dev/null
  base="https://nodejs.org/dist/latest-v${NODE_MAJOR}.x"
  line="$(curl -fsS "$base/SHASUMS256.txt" | grep -E ' node-v[0-9.]+-linux-x64\.tar\.xz$')" || die "Could not look up Node $NODE_MAJOR."
  sum="${line%% *}"
  file="${line##* }"
  curl -fsSL "$base/$file" -o "/tmp/$file"
  echo "$sum  /tmp/$file" | sha256sum -c -
  rm -rf /opt/node
  mkdir -p /opt/node
  tar -xJf "/tmp/$file" -C /opt/node --strip-components=1
  rm -f "/tmp/$file"
  for bin in node npm npx; do ln -sf "/opt/node/bin/$bin" "/usr/local/bin/$bin"; done
fi
node --version

say "Updating the backend and downloading the latest code"
# Also restarts the backend so it picks up the new settings above.
bash "$APP_DIR/Back-end/deploy/update.sh"

say "Preparing folders"
install -d -o "$APP_USER" -g "$APP_USER" -m 755 "$FRONT" "$FRONT/releases" "$STATE_DIR"
[ -f "$STATE_DIR/rebuild.flag" ] || install -o "$APP_USER" -g "$APP_USER" -m 644 /dev/null "$STATE_DIR/rebuild.flag"

say "Building the website (a few minutes the first time)"
runuser -u "$APP_USER" -- bash "$APP_DIR/Back-end/deploy/build-frontend.sh"

say "Setting up the web server for $SHOP_DOMAIN"
cat > /etc/nginx/snippets/laceloft-security.conf <<'EOF'
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
EOF
cat > /etc/nginx/sites-available/laceloft-shop <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name __SHOP__ www.__SHOP__;
    root __FRONT__/current;
    index index.html;
    include snippets/laceloft-security.conf;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml application/javascript application/json application/xml application/manifest+json image/svg+xml;

    # Built files have a hash in their name: cache them for a year.
    location /assets/ {
        try_files $uri =404;
        add_header Cache-Control "public, max-age=31536000, immutable";
        include snippets/laceloft-security.conf;
    }

    location /images/ {
        try_files $uri =404;
        add_header Cache-Control "public, max-age=2592000";
        include snippets/laceloft-security.conf;
    }

    location = /manifest.webmanifest {
        default_type application/manifest+json;
        add_header Cache-Control "no-cache";
        include snippets/laceloft-security.conf;
    }

    # Pages and the app's service worker: always check for a newer copy.
    location / {
        add_header Cache-Control "no-cache";
        include snippets/laceloft-security.conf;
        # /product/<sku>/ has its own prebuilt page (link previews); anything
        # else is a page of the app itself.
        try_files $uri $uri/index.html /index.html;
    }
}
EOF
sed -i "s|__SHOP__|$SHOP_DOMAIN|g; s|__FRONT__|$FRONT|g" /etc/nginx/sites-available/laceloft-shop
ln -sf /etc/nginx/sites-available/laceloft-shop /etc/nginx/sites-enabled/laceloft-shop
nginx -t
systemctl reload nginx

say "Making the admin's Publish button rebuild the website"
cat > /etc/systemd/system/laceloft-frontend.service <<EOF
[Unit]
Description=Rebuild the Laceloft shop website

[Service]
Type=oneshot
User=$APP_USER
Group=$APP_USER
ExecStart=/bin/bash $APP_DIR/Back-end/deploy/build-frontend.sh
TimeoutStartSec=900
EOF
cat > /etc/systemd/system/laceloft-frontend.path <<EOF
[Unit]
Description=Watch for the Publish button in the Laceloft admin

[Path]
PathChanged=$STATE_DIR/rebuild.flag
Unit=laceloft-frontend.service

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now laceloft-frontend.path

say "HTTPS for $SHOP_DOMAIN"
# Informational only: this server's DNS lookup can lag behind the real records
# for a while, so the certificate authority is the judge (it does a fresh lookup).
SERVER_IP="$(curl -4 -fsS --max-time 15 https://api.ipify.org || true)"
for host in "$SHOP_DOMAIN" "www.$SHOP_DOMAIN"; do
  ips="$(curl -fsS --max-time 15 "https://dns.google/resolve?name=$host&type=A"     | python3 -c 'import sys,json; d=json.load(sys.stdin); print(" ".join(a["data"] for a in d.get("Answer",[]) if a.get("type")==1))'     2>/dev/null || echo FAIL)"
  if [ -n "$SERVER_IP" ] && [ "$ips" != "FAIL" ] && [[ " $ips " != *" $SERVER_IP "* ]]; then
    warn "(this server still sees $host as '${ips:-nothing}'; trying the certificate anyway)"
  fi
done
HTTPS=no
if certbot --nginx -d "$SHOP_DOMAIN" -d "www.$SHOP_DOMAIN" --cert-name "$SHOP_DOMAIN" --expand     -m "$EMAIL" --agree-tos --no-eff-email --non-interactive --redirect; then
  HTTPS=yes
else
  warn "Could not get the HTTPS certificate yet."
  warn "Check that $SHOP_DOMAIN and www.$SHOP_DOMAIN point at $SERVER_IP in Hostinger DNS,"
  warn "wait a few minutes, then run this script again."
fi

say "Checking that it works"
if [ "$HTTPS" = yes ]; then
  base="https://$SHOP_DOMAIN"; resolve="--resolve $SHOP_DOMAIN:443:127.0.0.1"
else
  base="http://$SHOP_DOMAIN"; resolve="--resolve $SHOP_DOMAIN:80:127.0.0.1"
fi
# shellcheck disable=SC2086
home="$(curl -s -o /dev/null -w '%{http_code}' $resolve "$base/" || true)"
# shellcheck disable=SC2086
share="$(curl -s -o /dev/null -w '%{http_code}' $resolve "$base/product/LL-033/" || true)"
# shellcheck disable=SC2086
urls="$(curl -s $resolve "$base/sitemap.xml" | grep -c '<loc>' || true)"

printf '\n\033[1;32m============================================\033[0m\n'
echo " Shop home page          : $home   (expected 200)"
echo " A product link page     : $share   (expected 200)"
echo " Addresses in sitemap    : $urls   (expected 39 or more)"
echo " Shop   : $base"
echo " Admin  : https://$API_DOMAIN/admin/   (its Publish button now rebuilds this site)"
echo " Update : bash $APP_DIR/Back-end/deploy/update.sh   (also rebuilds the shop)"
printf '\033[1;32m============================================\033[0m\n'
if [ "$HTTPS" != yes ]; then
  echo "Next: point $SHOP_DOMAIN and www.$SHOP_DOMAIN at $SERVER_IP in Hostinger DNS, then run: bash frontend-setup.sh"
fi
