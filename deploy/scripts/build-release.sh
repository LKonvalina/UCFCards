#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RELEASE_DIR="${ROOT_DIR}/release"
ARCHIVE_PATH="${ROOT_DIR}/ucfcards-release.tar.gz"

PUBLIC_URL="${PUBLIC_URL:?PUBLIC_URL is required}"
VITE_API_URL="${PUBLIC_URL%/}/api"
VITE_SOCKET_URL="${PUBLIC_URL%/}"
VITE_CLERK_PUBLISHABLE_KEY="${VITE_CLERK_PUBLISHABLE_KEY:?VITE_CLERK_PUBLISHABLE_KEY is required}"

echo "Building UCFCards release for ${PUBLIC_URL}"

rm -rf "${RELEASE_DIR}" "${ARCHIVE_PATH}"
mkdir -p "${RELEASE_DIR}"

cd "${ROOT_DIR}/client"
npm ci
VITE_API_URL="${VITE_API_URL}" \
VITE_SOCKET_URL="${VITE_SOCKET_URL}" \
VITE_CLERK_PUBLISHABLE_KEY="${VITE_CLERK_PUBLISHABLE_KEY}" \
npm run build

cd "${ROOT_DIR}/server"
npm ci --omit=dev

mkdir -p "${RELEASE_DIR}/client"
mkdir -p "${RELEASE_DIR}/server"
mkdir -p "${RELEASE_DIR}/deploy"

cp -R "${ROOT_DIR}/client/dist/." "${RELEASE_DIR}/client/"
cp -R "${ROOT_DIR}/server/src" "${RELEASE_DIR}/server/"
cp "${ROOT_DIR}/server/package.json" "${RELEASE_DIR}/server/"
cp "${ROOT_DIR}/server/package-lock.json" "${RELEASE_DIR}/server/"
cp "${ROOT_DIR}/deploy/scripts/deploy-remote.sh" "${RELEASE_DIR}/deploy-remote.sh"
cp "${ROOT_DIR}/deploy/nginx/ucfcards.conf" "${RELEASE_DIR}/deploy/nginx-ucfcards.conf"
cp "${ROOT_DIR}/deploy/systemd/ucfcards.service" "${RELEASE_DIR}/deploy/ucfcards.service"

cd "${RELEASE_DIR}/server"
npm ci --omit=dev

cd "${ROOT_DIR}"
tar -czf "${ARCHIVE_PATH}" -C "${RELEASE_DIR}" .

echo "Release archive created at ${ARCHIVE_PATH}"
