#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR="/var/www/ucfcards"
ARCHIVE_PATH="/tmp/ucfcards-release.tar.gz"
SERVICE_NAME="ucfcards"
NGINX_SITE="/etc/nginx/sites-available/ucfcards"
NGINX_ENABLED="/etc/nginx/sites-enabled/ucfcards"

NODE_ENV="${NODE_ENV:-prod}"
PORT="${PORT:-5000}"
CLIENT_ORIGIN="${CLIENT_ORIGIN:?CLIENT_ORIGIN is required}"
MONGODB_URI="${MONGODB_URI:?MONGODB_URI is required}"
CLERK_PUBLISHABLE_KEY="${CLERK_PUBLISHABLE_KEY:?CLERK_PUBLISHABLE_KEY is required}"
CLERK_SECRET_KEY="${CLERK_SECRET_KEY:?CLERK_SECRET_KEY is required}"

if [[ ! -f "${ARCHIVE_PATH}" ]]; then
  echo "Release archive not found at ${ARCHIVE_PATH}"
  exit 1
fi

echo "Deploying UCFCards to ${DEPLOY_DIR}"

sudo mkdir -p "${DEPLOY_DIR}"
sudo rm -rf "${DEPLOY_DIR}"/*
sudo tar -xzf "${ARCHIVE_PATH}" -C "${DEPLOY_DIR}"

if ! id -u ucfcards >/dev/null 2>&1; then
  sudo useradd --system --home "${DEPLOY_DIR}" --shell /usr/sbin/nologin ucfcards
fi

sudo tee "${DEPLOY_DIR}/server/.env" >/dev/null <<EOF
NODE_ENV=${NODE_ENV}
PORT=${PORT}
CLIENT_ORIGIN=${CLIENT_ORIGIN}
MONGODB_URI=${MONGODB_URI}
CLERK_PUBLISHABLE_KEY=${CLERK_PUBLISHABLE_KEY}
CLERK_SECRET_KEY=${CLERK_SECRET_KEY}
EOF

sudo chown -R ucfcards:ucfcards "${DEPLOY_DIR}"
sudo chmod 600 "${DEPLOY_DIR}/server/.env"
sudo chmod +x "${DEPLOY_DIR}/deploy-remote.sh"

sudo cp "${DEPLOY_DIR}/deploy/ucfcards.service" "/etc/systemd/system/${SERVICE_NAME}.service"
if [[ -f "${NGINX_SITE}" ]] && sudo grep -qE 'listen[[:space:]]+443([[:space:]]|;)' "${NGINX_SITE}"; then
  echo "Preserving the existing HTTPS-enabled Nginx configuration."
else
  sudo cp "${DEPLOY_DIR}/deploy/nginx-ucfcards.conf" "${NGINX_SITE}"
fi
sudo ln -sf "${NGINX_SITE}" "${NGINX_ENABLED}"
sudo rm -f /etc/nginx/sites-enabled/default

sudo systemctl daemon-reload
sudo systemctl enable "${SERVICE_NAME}"
sudo systemctl restart "${SERVICE_NAME}"
sudo nginx -t
sudo systemctl reload nginx

rm -f "${ARCHIVE_PATH}"

echo "Deployment complete."
echo "Health check: curl -fsS http://127.0.0.1/api/health"
