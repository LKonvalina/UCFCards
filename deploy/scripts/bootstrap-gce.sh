#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo bash deploy/scripts/bootstrap-gce.sh"
  exit 1
fi

echo "Bootstrapping GCP Compute Engine host for UCFCards"

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y curl ca-certificates gnupg nginx rsync tar certbot python3-certbot-nginx

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v)" != v22* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

id -u ucfcards >/dev/null 2>&1 || useradd --system --home /var/www/ucfcards --shell /usr/sbin/nologin ucfcards
mkdir -p /var/www/ucfcards
chown -R ucfcards:ucfcards /var/www/ucfcards

ufw allow OpenSSH || true
ufw allow 'Nginx Full' || true

systemctl enable nginx
systemctl start nginx

echo "Bootstrap complete."
echo "Next: configure GitHub secrets and merge an approved PR to deploy."
