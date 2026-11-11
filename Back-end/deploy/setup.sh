#!/usr/bin/env bash
# Laceloft backend: one-time server setup for Ubuntu 24.04 (Hostinger KVM VPS).
#
#   bash setup.sh
#
# Installs Python, PostgreSQL and nginx, loads the shop's products and photos,
# creates the admin login, turns on free HTTPS, a firewall and daily backups.
# Safe to run again: it keeps the existing secrets, database and photos.
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/skenllp/Laceloft.git}"
BRANCH="${BRANCH:-main}"

APP_USER=laceloft
APP_HOME=/srv/laceloft
APP_DIR="$APP_HOME/app"
VENV="$APP_HOME/venv"
ENV_DIR=/etc/laceloft
ENV_FILE="$ENV_DIR/env"
MEDIA_DIR=/var/lib/laceloft/media
BACKUP_DIR=/var/backups/laceloft
DB_NAME=laceloft
DB_USER=laceloft

say() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m%s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Run this as root (the Hostinger browser terminal already is root)."
# shellcheck disable=SC1091
. /etc/os-release
[ "${ID:-}" = "ubuntu" ] || die "This script is for Ubuntu (24.04 recommended)."
cd /tmp

# Values given on the command line (for example DOMAIN=api.laceloft.in bash setup.sh)
# win over the ones saved by an earlier run.
OVERRIDABLE="DOMAIN ALT_DOMAINS LETSENCRYPT_EMAIL CORS_ALLOWED_ORIGINS FRONTEND_DEPLOY_HOOK"
for v in $OVERRIDABLE; do
  if [ -n "${!v:-}" ]; then printf -v "CLI_$v" '%s' "${!v}"; fi
done

# Reuse answers and secrets from an earlier run.
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi
PREV_DOMAIN="${DOMAIN:-}"
for v in $OVERRIDABLE; do
  k="CLI_$v"
  if [ -n "${!k:-}" ]; then printf -v "$v" '%s' "${!k}"; fi
done

# ask VAR "Question" "default": skipped when VAR is already set.
ask() {
  local var="$1" q="$2" def="${3:-}" ans=""
  if [ -n "${!var:-}" ]; then return 0; fi
  if [ -n "$def" ]; then
    read -r -p "$q [$def]: " ans </dev/tty || true
    ans="${ans:-$def}"
  else
    read -r -p "$q: " ans </dev/tty || true
  fi
  printf -v "$var" '%s' "$ans"
}

say "A few questions"
ask DOMAIN "Backend web address (hostname, no https://)" "$(hostname -f 2>/dev/null || hostname)"
ask LETSENCRYPT_EMAIL "Your email (for HTTPS certificate notices)"
ask CORS_ALLOWED_ORIGINS "Shop website address(es), comma separated" "https://laceloft.onrender.com"
[[ "$DOMAIN" =~ ^[A-Za-z0-9.-]+$ ]] || die "That web address does not look right: $DOMAIN"
[[ "$LETSENCRYPT_EMAIL" == *@*.* ]] || die "Please give a real email address."

# When the address changes, keep the old one working too (nothing breaks mid-move).
if [ -n "$PREV_DOMAIN" ] && [ "$PREV_DOMAIN" != "$DOMAIN" ] && [ -z "${ALT_DOMAINS:-}" ]; then
  ALT_DOMAINS="$PREV_DOMAIN"
fi
ALT_DOMAINS="${ALT_DOMAINS:-}"
ALL_DOMAINS="$DOMAIN"
if [ -n "$ALT_DOMAINS" ]; then ALL_DOMAINS="$DOMAIN,$ALT_DOMAINS"; fi
IFS=, read -r -a HOSTS <<< "$ALL_DOMAINS"

# Each address must already point at this server, or HTTPS cannot be issued.
# Ask a public DNS server: this machine's own /etc/hosts maps its hostname to
# 127.0.1.1, which says nothing about what the internet sees.
SERVER_IP="$(curl -4 -fsS --max-time 15 https://api.ipify.org || true)"
for host in "${HOSTS[@]}"; do
  DNS_IPS="$(curl -fsS --max-time 15 "https://dns.google/resolve?name=$host&type=A" \
    | python3 -c 'import sys,json; d=json.load(sys.stdin); print(" ".join(a["data"] for a in d.get("Answer",[]) if a.get("type")==1))' \
    2>/dev/null || echo FAIL)"
  if [ -z "$SERVER_IP" ] || [ "$DNS_IPS" = "FAIL" ]; then
    warn "Could not double-check the DNS record for $host, carrying on."
  elif [[ " $DNS_IPS " != *" $SERVER_IP "* ]]; then
    die "$host points to '${DNS_IPS:-nothing}' on the internet, but this server is $SERVER_IP.
Add a DNS 'A' record for $host -> $SERVER_IP, wait a few minutes, then run this again."
  fi
done

say "Installing system packages (a few minutes)"
export DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a
apt-get update -y
apt-get upgrade -y -o Dpkg::Options::=--force-confold
apt-get install -y python3 python3-venv python3-dev build-essential libpq-dev \
  postgresql nginx certbot python3-certbot-nginx git curl openssl ufw fail2ban \
  unattended-upgrades cron

say "Creating the app user and folders"
id "$APP_USER" >/dev/null 2>&1 || adduser --system --group --home "$APP_HOME" --shell /usr/sbin/nologin "$APP_USER"
install -d -o "$APP_USER" -g "$APP_USER" -m 755 "$APP_HOME" "$MEDIA_DIR"
install -d -o root -g "$APP_USER" -m 750 "$ENV_DIR"
install -d -o root -g root -m 700 "$BACKUP_DIR"

say "Setting up the database"
SECRET_KEY="${SECRET_KEY:-$(openssl rand -hex 32)}"
DB_PASSWORD="${DB_PASSWORD:-$(openssl rand -hex 16)}"
systemctl enable --now postgresql
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DB_USER') THEN
    CREATE ROLE $DB_USER LOGIN PASSWORD '$DB_PASSWORD';
  ELSE
    ALTER ROLE $DB_USER PASSWORD '$DB_PASSWORD';
  END IF;
END \$\$;
SQL
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 \
  || sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"

say "Writing the settings file ($ENV_FILE)"
FIRST_SHOP="${CORS_ALLOWED_ORIGINS%%,*}"
umask 077
cat > "$ENV_FILE" <<EOF
SECRET_KEY=$SECRET_KEY
PRODUCTION=1
DEBUG=False
DATABASE_URL=postgres://$DB_USER:$DB_PASSWORD@127.0.0.1:5432/$DB_NAME
MEDIA_ROOT=$MEDIA_DIR
ALLOWED_HOSTS=$ALL_DOMAINS
CORS_ALLOWED_ORIGINS=$CORS_ALLOWED_ORIGINS
FRONTEND_URL=$FIRST_SHOP
FRONTEND_DEPLOY_HOOK=${FRONTEND_DEPLOY_HOOK:-}
DOMAIN=$DOMAIN
ALT_DOMAINS=$ALT_DOMAINS
LETSENCRYPT_EMAIL=$LETSENCRYPT_EMAIL
DB_PASSWORD=$DB_PASSWORD
EOF
umask 022
chown root:"$APP_USER" "$ENV_FILE"
chmod 640 "$ENV_FILE"

say "Downloading the app"
if [ -d "$APP_DIR/.git" ]; then
  sudo -u "$APP_USER" git -C "$APP_DIR" fetch --depth 1 origin "$BRANCH"
  sudo -u "$APP_USER" git -C "$APP_DIR" reset --hard FETCH_HEAD
else
  sudo -u "$APP_USER" git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

say "Installing Python packages"
[ -x "$VENV/bin/python" ] || sudo -u "$APP_USER" python3 -m venv "$VENV"
sudo -u "$APP_USER" "$VENV/bin/pip" install --quiet --upgrade pip wheel
sudo -u "$APP_USER" "$VENV/bin/pip" install --quiet -r "$APP_DIR/Back-end/requirements.txt"

# Runs a manage.py command as the app user with the settings file loaded.
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

say "Preparing the shop (database tables, styles, products and photos)"
djm migrate --no-input
djm collectstatic --no-input
djm seed_products
djm make_thumbs

say "Admin login"
if djm shell -c "import sys; from django.contrib.auth import get_user_model as g; sys.exit(0 if g().objects.exists() else 1)" >/dev/null 2>&1; then
  echo "An admin login already exists, leaving it as it is."
else
  ask ADMIN_USER "Admin username" "laceloft"
  ask ADMIN_EMAIL "Admin email" "$LETSENCRYPT_EMAIL"
  while [ -z "${ADMIN_PASSWORD:-}" ]; do
    read -r -s -p "Choose an admin password (12+ characters, typing is hidden): " p1 </dev/tty; echo
    read -r -s -p "Type it again: " p2 </dev/tty; echo
    if [ "$p1" != "$p2" ]; then warn "Those did not match, try again."; continue; fi
    if [ "${#p1}" -lt 12 ]; then warn "Please use at least 12 characters."; continue; fi
    ADMIN_PASSWORD="$p1"
  done
  (
    export DJANGO_SUPERUSER_USERNAME="$ADMIN_USER" DJANGO_SUPERUSER_EMAIL="$ADMIN_EMAIL" DJANGO_SUPERUSER_PASSWORD="$ADMIN_PASSWORD"
    djm createsuperuser --noinput
  )
  unset ADMIN_PASSWORD p1 p2
fi

say "Starting the backend service"
cat > /etc/systemd/system/laceloft.service <<EOF
[Unit]
Description=Laceloft backend (gunicorn)
After=network.target postgresql.service

[Service]
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR/Back-end
EnvironmentFile=$ENV_FILE
ExecStart=$VENV/bin/gunicorn eleven_backend.wsgi:application --bind 127.0.0.1:8000 --workers 2 --threads 2 --timeout 60 --access-logfile - --error-logfile -
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable laceloft
systemctl restart laceloft

say "Setting up the web server (nginx)"
cat > /etc/nginx/sites-available/laceloft <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${ALL_DOMAINS//,/ };
    client_max_body_size 25m;

    # Product photos straight from disk (fast, no Python involved).
    location /media/ {
        alias $MEDIA_DIR/;
        expires 30d;
        add_header Cache-Control "public";
        access_log off;
    }

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
    }
}
EOF
ln -sf /etc/nginx/sites-available/laceloft /etc/nginx/sites-enabled/laceloft
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable --now nginx
systemctl reload nginx

say "Firewall and protection"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
systemctl enable --now fail2ban

say "Free HTTPS certificate"
CERT_ARGS=()
for host in "${HOSTS[@]}"; do CERT_ARGS+=(-d "$host"); done
certbot --nginx "${CERT_ARGS[@]}" --cert-name "$DOMAIN" --expand -m "$LETSENCRYPT_EMAIL" --agree-tos --no-eff-email --non-interactive --redirect

say "Daily backups (database and photos, kept 14 days)"
cat > /usr/local/bin/laceloft-backup <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
d=/var/backups/laceloft
ts="$(date +%F)"
mkdir -p "$d"
runuser -u postgres -- pg_dump laceloft | gzip > "$d/db-$ts.sql.gz"
tar -czf "$d/media-$ts.tar.gz" -C /var/lib/laceloft media
find "$d" -type f -mtime +14 -delete
EOF
chmod 755 /usr/local/bin/laceloft-backup
echo "30 3 * * * root /usr/local/bin/laceloft-backup" > /etc/cron.d/laceloft-backup
chmod 644 /etc/cron.d/laceloft-backup
/usr/local/bin/laceloft-backup

say "Checking that it works"
sleep 3
COUNT="$(curl -fsS "https://$DOMAIN/api/products/" | python3 -c 'import sys,json; d=json.load(sys.stdin); d=d.get("results",d) if isinstance(d,dict) else d; print(len(d))' || true)"
HTTP_ADMIN="$(curl -s -o /dev/null -w '%{http_code}' "https://$DOMAIN/admin/login/" || true)"

printf '\n\033[1;32m============================================\033[0m\n'
echo " Products live on the new server : ${COUNT:-?}   (expected 33)"
echo " Admin page status               : $HTTP_ADMIN   (expected 200)"
echo " API   : https://$DOMAIN/api/products/"
echo " Admin : https://$DOMAIN/admin/"
echo " Backups: $BACKUP_DIR (daily, 14 days)"
echo " To update later: bash $APP_DIR/Back-end/deploy/update.sh"
printf '\033[1;32m============================================\033[0m\n'
if [ -f /var/run/reboot-required ]; then warn "The system installed a kernel update. Please run: reboot"; fi
