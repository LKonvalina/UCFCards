#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo DOMAIN=example.com EMAIL=you@example.com bash enable-https.sh"
  exit 1
fi

DOMAIN="${DOMAIN:?DOMAIN is required, e.g. cards.example.com}"
EMAIL="${EMAIL:?EMAIL is required for Let's Encrypt notices}"

export DEBIAN_FRONTEND=noninteractive

echo "Enabling HTTPS for ${DOMAIN}"

apt-get update
apt-get install -y certbot python3-certbot-nginx

# Ensure Nginx site is installed and HTTP works before certbot
if [[ ! -f /etc/nginx/sites-available/ucfcards ]]; then
  if [[ -f /var/www/ucfcards/deploy/nginx-ucfcards.conf ]]; then
    cp /var/www/ucfcards/deploy/nginx-ucfcards.conf /etc/nginx/sites-available/ucfcards
  else
    echo "Missing /etc/nginx/sites-available/ucfcards — deploy the app first."
    exit 1
  fi
fi

# Replace catch-all server_name so certbot can issue for this domain
sed -i "s/server_name .*/server_name ${DOMAIN};/" /etc/nginx/sites-available/ucfcards

ln -sf /etc/nginx/sites-available/ucfcards /etc/nginx/sites-enabled/ucfcards
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl reload nginx

certbot --nginx \
  --non-interactive \
  --agree-tos \
  --redirect \
  --email "${EMAIL}" \
  -d "${DOMAIN}"

nginx -t
systemctl reload nginx

# Keep certbot renew timer enabled (installed with certbot package)
systemctl enable certbot.timer || true
systemctl start certbot.timer || true

echo
echo "HTTPS enabled for https://${DOMAIN}"
echo "Next steps:"
echo "  1. Open TCP 443 in the GCP VPC firewall (and ufw if enabled)."
echo "  2. Set CLIENT_ORIGIN=https://${DOMAIN} in /var/www/ucfcards/server/.env"
echo "  3. Rebuild the client with PUBLIC_URL=https://${DOMAIN} and redeploy client files."
echo "  4. Add https://${DOMAIN} in the Clerk dashboard Domains."
echo "  5. sudo systemctl restart ucfcards"
echo "  6. curl -fsS https://${DOMAIN}/api/health"
