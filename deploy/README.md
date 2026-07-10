# GCP Compute Engine Deployment

Deploys the UCFCards MERN stack to a single GCP VM running **Nginx** (static React app + reverse proxy) and a **Node.js** API with **Socket.IO**.

## Architecture

```
Internet
   |
   v
Nginx :80 / :443
   |-- /              -> /var/www/ucfcards/client (Vite build)
   |-- /api/*         -> Node.js :5000 (Express)
   '-- /socket.io/*   -> Node.js :5000 (WebSocket upgrade)

Node.js systemd service: ucfcards
MongoDB Atlas          -> MONGODB_URI
Clerk OAuth            -> CLERK_SECRET_KEY / VITE_CLERK_PUBLISHABLE_KEY
```

## One-time VM setup

1. Create a **Compute Engine** VM (Ubuntu 22.04+, e2-small or larger).
2. Allow HTTP/HTTPS and SSH in the VPC firewall (TCP **22**, **80**, and **443**).
3. SSH into the VM and run:

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_ORG/UCFCards/main/deploy/scripts/bootstrap-gce.sh | sudo bash
```

Or copy `deploy/scripts/bootstrap-gce.sh` to the VM and run:

```bash
sudo bash bootstrap-gce.sh
```

4. Create a **GCP service account** for GitHub Actions with:
   - `roles/compute.instanceAdmin.v1` (or `compute.osAdminLogin` + OS Login)
   - Ability to `scp`/`ssh` to the instance

5. Download the service account JSON key for `GCP_SA_KEY`.

## GitHub configuration

### Repository secrets

| Secret | Example | Purpose |
|--------|---------|---------|
| `GCP_SA_KEY` | `{...json...}` | Service account key for `gcloud` |
| `GCP_PROJECT_ID` | `my-gcp-project` | GCP project |
| `GCE_INSTANCE_NAME` | `ucfcards-mvp` | VM name |
| `GCE_ZONE` | `us-central1-a` | VM zone |
| `PUBLIC_URL` | `https://cards.example.com` | Public site URL (also used for Vite build) |
| `MONGODB_URI` | `mongodb+srv://...` | Atlas connection string |
| `CLERK_SECRET_KEY` | `sk_live_...` | Clerk backend key |
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_live_...` | Clerk frontend key (build-time) |

### GitHub Environment: `production`

The deploy workflow uses `environment: production`. Recommended settings:

1. **Settings → Environments → production**
2. Add **Required reviewers** (maps to “approved” deploy gate)
3. Optionally restrict to `main` branch

### Clerk dashboard

Add your `PUBLIC_URL` to Clerk **Domains** and enable **Google** OAuth.

Set `CLIENT_ORIGIN` to the same value as `PUBLIC_URL` (the deploy script does this automatically).

## When deployment runs

| Trigger | Behavior |
|---------|----------|
| **Merged PR** to `main`/`master` | Runs tests, then deploys (after environment approval if configured) |
| **Manual** `workflow_dispatch` | Same pipeline, triggered from Actions tab |

Typical flow:

1. Open PR → **CI** workflow runs tests
2. Reviewer approves PR
3. Merge PR → **Deploy** workflow runs tests again, then deploys
4. If `production` environment has required reviewers, deploy waits for approval

## Enable HTTPS (Let's Encrypt)

Browsers and Clerk expect HTTPS in production. You need a **DNS domain** pointing at the VM (Let's Encrypt does not issue trusted certs for a bare IP alone).

1. Create an **A record**: `cards.yourdomain.com` → VM external IP.
2. Open GCP firewall TCP **443**.
3. On the VM:

```bash
# Copy enable-https.sh from the repo, then:
sudo DOMAIN=cards.yourdomain.com EMAIL=you@example.com bash /tmp/enable-https.sh
```

Or from a cloned repo:

```bash
cd ~/UCFCards
sudo DOMAIN=cards.yourdomain.com EMAIL=you@example.com bash deploy/scripts/enable-https.sh
```

4. Point the app at HTTPS:

```bash
sudo sed -i 's|^CLIENT_ORIGIN=.*|CLIENT_ORIGIN=https://cards.yourdomain.com|' /var/www/ucfcards/server/.env
sudo systemctl restart ucfcards
```

5. Rebuild the client with HTTPS URLs (Vite bakes these in at build time):

```bash
cd ~/UCFCards/client
npm ci
export VITE_API_URL="https://cards.yourdomain.com/api"
export VITE_SOCKET_URL="https://cards.yourdomain.com"
export VITE_CLERK_PUBLISHABLE_KEY="pk_live_or_test_..."
npm run build
sudo rm -rf /var/www/ucfcards/client/*
sudo cp -R dist/. /var/www/ucfcards/client/
sudo chown -R ucfcards:ucfcards /var/www/ucfcards/client
```

6. Add `https://cards.yourdomain.com` in **Clerk → Domains**.
7. Verify:

```bash
curl -fsS https://cards.yourdomain.com/api/health
```

Certificates renew automatically via `certbot.timer`.

## Manual deploy (local)

```bash
export PUBLIC_URL=http://YOUR_VM_IP
export VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
bash deploy/scripts/build-release.sh

gcloud compute scp ucfcards-release.tar.gz INSTANCE:/tmp/ucfcards-release.tar.gz --zone ZONE
gcloud compute scp deploy/scripts/deploy-remote.sh INSTANCE:/tmp/deploy-remote.sh --zone ZONE
gcloud compute ssh INSTANCE --zone ZONE --command "sudo CLIENT_ORIGIN='$PUBLIC_URL' MONGODB_URI='...' CLERK_SECRET_KEY='...' bash /tmp/deploy-remote.sh"
```

## Verify

```bash
curl http://YOUR_VM_IP/api/health
# {"ok":true}
```

Open `PUBLIC_URL` in a browser, sign in with Clerk, create/join a table.

## Troubleshooting

```bash
# API logs
sudo journalctl -u ucfcards -f

# Nginx
sudo nginx -t
sudo systemctl status nginx

# Restart services
sudo systemctl restart ucfcards
sudo systemctl reload nginx
```
