# Oracle VM Deployment

This deployment path runs Neet2Work on an Oracle VM with Docker Compose.

## Server Layout

- App path: `/opt/neet2work`
- Current release: `/opt/neet2work/current`
- Env file: `/opt/neet2work/.env.production`
- Public HTTPS: Caddy on ports `80` and `443`
- Frontend: nginx on localhost port `8080`
- Backend: internal Docker network on port `3000`
- Database: external PostgreSQL, usually the configured Supabase project DB

## GitHub Secrets

Configure these repository secrets:

- `ORACLE_HOST`: public IP or DNS name, for example `129.146.96.211`
- `ORACLE_USER`: SSH user, for Ubuntu images use `ubuntu`
- `ORACLE_SSH_PRIVATE_KEY`: private key text for the Oracle VM
- `ORACLE_DEPLOY_PATH`: optional, defaults to `/opt/neet2work`

## First Server Setup

Create `/opt/neet2work/.env.production` from `deploy/oracle/env.production.example`.
Use a long random value for `JWT_SECRET`, and set `DATABASE_URL` to the
production PostgreSQL connection string.

The GitHub workflow installs Docker on the VM when it is missing, then runs:

```bash
bash scripts/deploy-oracle.sh
```

The VM does not need GitHub repository credentials. GitHub Actions checks out the
code, uploads a tar archive to the VM, and switches `/opt/neet2work/current` to
the uploaded release.

## HTTPS

The current deployment uses a free DuckDNS hostname:

```txt
neet2work.duckdns.org
```

Oracle Cloud security rules and the VM host firewall must allow inbound TCP
`80` and `443`. Caddy terminates HTTPS, renews certificates automatically, and
reverse proxies traffic to the frontend container on `127.0.0.1:8080`.

## Temporary Codex Demo Mode

For portfolio demos, the public Oracle site can keep serving the production
frontend while `/api/*` and `/health` are temporarily proxied through an SSH
reverse tunnel to a work PC running the backend with Codex Bridge enabled.

Start the work PC backend, SSH reverse tunnel, and Caddy demo mode:

```powershell
.\2-demo-oracle-site.cmd
```

The script waits until the tunnel is reachable from Oracle, switches Caddy into
demo mode, and restores the normal Caddyfile when the script exits.

During the demo, users still open:

```txt
https://neet2work.duckdns.org
```

Restore the normal Oracle backend after the demo:

```powershell
.\oracle-caddy-demo-mode.cmd -Action disable
```

Check the current Caddy mode and tunnel health:

```powershell
.\oracle-caddy-demo-mode.cmd -Action status
```

## Manual Deploy

```bash
cd /opt/neet2work/current
bash scripts/deploy-oracle.sh
```

## Pull-Based Auto Deploy

If GitHub Actions secrets are not configured, the VM can poll the public GitHub
repository instead:

```bash
DEPLOY_ROOT=/opt/neet2work REPO_URL=https://github.com/rune5362/neet2work.git BRANCH=sub-main bash scripts/oracle-poll-deploy.sh
```

On the Oracle VM this is installed as a systemd timer that checks `sub-main`
periodically and deploys only when the remote SHA changes.
