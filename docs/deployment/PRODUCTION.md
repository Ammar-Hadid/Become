# Become: first production deployment

For ongoing deployments after the one-time production setup, use
[automatic deployment](AUTO_DEPLOY.md). This document remains the first-install
and recovery walkthrough.

Prepared 13 September 2026. This is a walkthrough to execute later; no VPS or Neon changes were made during preparation. Read the [readiness report](READINESS.md) first.

The deployment is one Next.js process behind Caddy on your existing Hetzner CPX22, with a dedicated Neon PostgreSQL database. Media stays on the VPS. This guide assumes Ubuntu 24.04 LTS or Debian 12/13 with systemd and a sudo-capable SSH account. If your server uses another OS or another proxy already owns ports 80/443, resolve that difference before running the installation commands. Do not replace, stop, or repurpose Auctus services, files, databases, users, or proxy configuration.

Commands marked **LOCAL** run on your Mac in this repository. Commands marked **VPS** run in your SSH session. SQL runs in Neon's SQL Editor unless stated otherwise. Replace example values before running a block. Run blocks one at a time; stop at errors. In nano, save with Ctrl+O, Enter, then exit with Ctrl+X.

Use these names throughout:

| Item | Value |
| --- | --- |
| Publi c domain | Your own subdomain, replacing `become.example.com` |
| Application account/service | `become` / `become.service` |
| Releases / active link | `/srv/apps/become/releases/<commit>` / `/srv/apps/become/current` |
| Persistent data root | `/srv/data/become` |
| Uploaded media | `/srv/data/become/media` |
| Local backup sets | `/srv/backups/become/<UTC timestamp>` |
| Runtime secrets | `/etc/become/production.env` |
| Maintenance credentials | `/etc/become/maintenance.env` (root only) |
| Backup credentials | `/etc/become/backup.env` (root only) |
| Dedicated Node runtime | `/opt/become-node` |
| Next upstream | `127.0.0.1:3010` (first verify the port is unused) |

A release contains application code, dependencies, generated Prisma, and `.next`. It never contains production `.env` files or uploaded media. Do not create a `public/uploads` directory or a Caddy file-server route for media.

## 1. Create and configure Neon

1. Create/sign into your Neon account and enable account MFA. Create a **new project dedicated to Become**, named `become-production`.
2. Choose a European region close to your actual VPS region. Select PostgreSQL **17** to match the local database and migration verification. Use a production branch, a database called `become`, and an owner role called `become_owner`. If the console initially creates different names, create/select these names before continuing.
3. Select the production branch/database in the SQL Editor. Confirm with `SELECT current_database(), current_user(), version();`. Do not connect any development test runner to this database.
4. Configure the project's restore/history window and spending/usage alerts deliberately. Record the actual available retention in your password manager; it depends on your Neon plan. A database restore window does not back up media on the VPS.
5. Generate a separate app-role password with `openssl rand -hex 32` on your Mac and save it in your password manager. Create the low-privilege runtime role **with SQL**, not the Neon console role-creation button:

```sql
-- Replace the password literal before running. Run once in database become.
CREATE ROLE become_app LOGIN PASSWORD 'REPLACE_WITH_RANDOM_HEX_PASSWORD'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
REVOKE ALL ON DATABASE become FROM PUBLIC;
GRANT CONNECT ON DATABASE become TO become_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO become_app;
```

The owner must own the database and have permission to create tables in `public`. The runtime role must not be a member of `become_owner` or `neon_superuser`. Neon console-created roles have elevated membership; SQL-created roles let us avoid giving that to the running app. [Neon role behavior](https://neon.com/docs/reference/compatibility)

This guide starts production **empty**. It does not transfer your real local history. If you want that history in production, first rehearse a paired local database-and-media restore into a separate Neon database and media directory using section 14. Do not mix local rows into an already populated production database or import development test databases.

## 2. Understand the two database URLs and migration commands

In Neon's **Connect** dialog, select the correct branch, database, and role. Copy two connection strings into your password manager:

- **Runtime:** `become_app`, pooled connection (hostname contains `-pooler`). Put it in `DATABASE_URL` in `production.env`.
- **Maintenance:** `become_owner`, direct connection (pooling disabled). Put it in `DIRECT_DATABASE_URL` in `maintenance.env`.

If the SQL-created app role is not listed by the connection dialog, use the same pooled hostname/database with its SQL-created username and password. Do not manually guess the endpoint hostname. Use URL-encoded passwords; the random hexadecimal passwords above need no encoding.

For this deployment, use `sslmode=verify-full&channel_binding=require`. The application uses `pg` through Prisma's PostgreSQL adapter and verifies the server certificate. The PostgreSQL CLI additionally uses the OS CA file from `PGSSLROOTCERT`. Never use `rejectUnauthorized=false`, `sslmode=disable`, or a certificate-verification bypass. [Neon connection security](https://neon.com/docs/security/security-overview)

This repository's `prisma.config.ts` reads **DATABASE_URL**, not DIRECT_DATABASE_URL. Maintenance commands below deliberately set `DATABASE_URL` to the direct owner URL for that command. Runtime continues to use its separate pooled app URL.

Use `pnpm db:deploy` (`prisma migrate deploy`) in production. It applies committed `migration.sql` files. **Never run `db:migrate`, `migrate dev`, `db push`, `migrate reset`, or a test suite against production.** `db:generate` only generates code; it does not apply migrations. `db:sync-tech` writes built-in reference data only. Migrations remain unchanged by this cleanup.

## 3. Inspect the VPS and create dedicated directories

**VPS — read-only inspection first:**

```bash
cat /etc/os-release
uname -m
free -h
df -h /srv /var
sudo ss -ltnp
sudo systemctl status caddy --no-pager
sudo systemctl cat caddy
sudo ufw status verbose
id become
```

An error from `id become` is expected if the new account does not exist. Check that 3010 is unused, the proposed paths do not contain another installation, and disk/memory have room for the existing apps, a build, two releases and backups. If 3010 is occupied, choose another unused loopback port and change both `become.service` and the new Caddy site block consistently. Do not kill the process occupying it.

**VPS — only when these names/paths are available:**

```bash
sudo useradd --system --user-group --home-dir /srv/apps/become --shell /usr/sbin/nologin become
sudo install -d -o become -g become -m 0750 /srv/apps/become /srv/apps/become/releases
sudo install -d -o become -g become -m 0700 /srv/data/become /srv/data/become/media
sudo install -d -o root -g root -m 0700 /srv/backups/become
sudo install -d -o root -g become -m 0750 /etc/become
```

If a `become` account or directory already exists, inspect its ownership and contents instead of recreating or recursively changing it. Caddy must not belong to the `become` group. Never use `chmod 777`. The app creates media subdirectories with mode 0700 and image files with mode 0600.

## 4. Install a separate Node runtime and PostgreSQL client tools

**VPS:** install prerequisites through the OS package manager; review the proposed package transaction if Caddy or another service is already installed. Do not run a blanket system upgrade during this deployment.

```bash
sudo apt-get update
sudo apt-get install ca-certificates curl xz-utils git openssl rsync restic
```

Install Node **24 LTS** in a dedicated directory, without replacing the system Node used by Auctus. The release below was current at preparation; recheck the official release list before a much later deployment. [Node releases](https://github.com/nodejs/node/releases)

```bash
cd /tmp
BECOME_NODE_VERSION=v24.21.0
case "$(uname -m)" in
  x86_64) BECOME_NODE_ARCH=x64 ;;
  aarch64) BECOME_NODE_ARCH=arm64 ;;
  *) echo 'Unsupported architecture'; exit 1 ;;
esac
BECOME_NODE_ARCHIVE="node-${BECOME_NODE_VERSION}-linux-${BECOME_NODE_ARCH}.tar.xz"
curl -fSLO "https://nodejs.org/dist/${BECOME_NODE_VERSION}/${BECOME_NODE_ARCHIVE}"
curl -fSLo become-node-SHASUMS256.txt "https://nodejs.org/dist/${BECOME_NODE_VERSION}/SHASUMS256.txt"
awk -v f="$BECOME_NODE_ARCHIVE" '$2 == f' become-node-SHASUMS256.txt | sha256sum --check --strict
sudo install -d -m 0755 /opt/become-node
sudo tar -xJf "$BECOME_NODE_ARCHIVE" -C /opt/become-node --strip-components=1
sudo env PATH=/opt/become-node/bin:/usr/bin:/bin /opt/become-node/bin/npm install --global pnpm@11.19.0
/opt/become-node/bin/node --version
env PATH=/opt/become-node/bin:/usr/bin:/bin /opt/become-node/bin/pnpm --version
```

Expect Node 24.x and pnpm 11.19.0. Verify the checksum command actually reports the chosen archive `OK`. Do not overwrite an existing `/opt/become-node` during a future update while the service is running; retain old runtime versions for rollback.

Install PostgreSQL **17 client tools** (not a PostgreSQL server). If `apt-cache policy postgresql-client-17` shows no candidate, add the official PGDG repository. First check for an existing PGDG entry under `/etc/apt/sources.list.d/`; do not duplicate or replace one. For a server without that repository:

```bash
sudo install -d -m 0755 /usr/share/postgresql-common/pgdg
sudo curl -fsSLo /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc
. /etc/os-release
printf 'deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt %s-pgdg main\n' "$VERSION_CODENAME" | sudo tee /etc/apt/sources.list.d/pgdg.list
sudo apt-get update
```

These are the [official Ubuntu](https://www.postgresql.org/download/linux/ubuntu/) / [Debian](https://www.postgresql.org/download/linux/debian/) repository instructions. Then:

```bash
sudo apt-get install postgresql-client-17
psql --version
pg_dump --version
pg_restore --version
```

All three should be 17.x or a newer supported client. `pg_dump` cannot dump a newer server major version than its own. Do not install/run the repository's Docker Compose PostgreSQL on this VPS; Neon is the production database. [pg_dump compatibility](https://www.postgresql.org/docs/current/app-pgdump.html)

## 5. Prepare the production environment files

**VPS:** create files without exposing secrets in shell history. Use the templates in `ops/production/` as references, then paste values in an editor. The shell snippets below assume the simple `KEY='value'` format shown. Do not use shell expressions, `export`, or `$(...)` inside these files.

```bash
sudo test ! -e /etc/become/production.env || { echo "Environment file already exists: inspect it first"; exit 1; }
sudo install -o root -g become -m 0640 /dev/null /etc/become/production.env
sudo nano /etc/become/production.env
```

Complete runtime file:

```dotenv
NODE_ENV='production'
DATABASE_URL='postgresql://become_app:YOUR_APP_PASSWORD@YOUR_POOLER_HOST/become?sslmode=verify-full&channel_binding=require'
BETTER_AUTH_SECRET='YOUR_OPENSSL_RAND_HEX_32_OUTPUT'
BETTER_AUTH_URL='https://become.example.com'
APP_TIMEZONE='Europe/Amsterdam'
BECOME_DATA_DIR='/srv/data/become'
BECOME_ALLOW_SIGNUP='false'
NEXT_TELEMETRY_DISABLED='1'
COTS_ENABLED_PROVIDERS='none'
COTS_MONTHLY_SPEND_LIMIT_USD='0'
```

Generate `BETTER_AUTH_SECRET` with `openssl rand -hex 32`. Keep it stable across deployments and back it up in your password manager. The URL must be the exact public HTTPS origin, without a path. `BECOME_DATA_DIR` is **/srv/data/become**, not `/srv/data/become/media`, because stored keys already start with `media/`.

`APP_TIMEZONE` defaults to Europe/Amsterdam. Keep this value for the first deployment. It is deliberately embedded in browser and server bundles so calendar boundaries agree; changing it requires a rebuild and a careful review of historical date semantics.

The first six settings above configure the app/environment; `BECOME_ALLOW_SIGNUP` explicitly locks registration, `NEXT_TELEMETRY_DISABLED` opts out of framework telemetry, and the COTS values keep optional external services inactive. No `OPENAI_API_KEY`, email provider, bank integration, Redis, `NEXTAUTH_*`, or `NEXT_PUBLIC_*` secret is required. No background AI jobs run. Finance recurrence is processed on authenticated use, not by a cron daemon.

Do not set `BECOME_E2E_PORT`, `RUN_*_INTEGRATION`, or test database URLs in production. Do not copy `.env` from your Mac. Ignore rules now exclude other `.env.*` secret files as well.

**VPS — root-only maintenance file:**

```bash
sudo test ! -e /etc/become/maintenance.env || { echo "Maintenance file already exists: inspect it first"; exit 1; }
sudo install -o root -g root -m 0600 /dev/null /etc/become/maintenance.env
sudo nano /etc/become/maintenance.env
```

```dotenv
DIRECT_DATABASE_URL='postgresql://become_owner:YOUR_OWNER_PASSWORD@YOUR_DIRECT_HOST/become?sslmode=verify-full&channel_binding=require'
PGSSLROOTCERT='/etc/ssl/certs/ca-certificates.crt'
```

The running app cannot read the owner password. Keep maintenance credentials in your password manager as well.

Optional provider variables, only if you later intentionally enable the corresponding discovery provider:

| Variable | Default / purpose |
| --- | --- |
| `COTS_ENABLED_PROVIDERS` | First launch `none`; later comma-separated identifiers from `.env.example`. Empty/unset enables all configured adapters. |
| `COTS_MAX_IMAGES`, `COTS_MAX_QUOTES` | 24 and 48; server caps are 100 and 200. |
| `COTS_MONTHLY_SPEND_LIMIT_USD` | 0; explicit total spend boundary. |
| `COTS_ZEROCHAN_USERNAME` | Provider identification if enabled. |
| `COTS_ZEROCHAN_TAGS_JSON` | `{}`; optional canonical tag aliases. |
| `COTS_SERPAPI_API_KEY`, `COTS_SERPAPI_PLAN` | Credential and `free` or `starter` plan. |
| `COTS_BRAVE_SEARCH_API_KEY`, `COTS_BRAVE_STORAGE_ALLOWED` | Credential and explicit storage permission, default `false`. |
| `COTS_CLIPCAFE_API_KEY`, `COTS_CLIPCAFE_RETENTION_ALLOWED`, `COTS_CLIPCAFE_MONTHLY_COST_USD` | Credential, retention permission (false), approved monthly cost (0). |
| `COTS_STANDS4_UID`, `COTS_STANDS4_TOKEN_ID`, `COTS_STANDS4_RETENTION_ALLOWED` | Credentials and retention permission (false). |

Manual images/text remain available with providers disabled. Configure real provider entitlement and budgets before enabling them; see [Phase 5.5](../decisions/PHASE_5_5.md). No provider purchase is implied by this guide.

## 6. Transfer and build an exact release

First review and commit the cleanup on your Mac. The deployment archive below contains **committed code only**, so verify it includes these production changes. Pick a reviewed commit and retain its hash. Do not deploy a moving branch or a dirty working directory.

**LOCAL:**

```bash
git status --short
git log -1 --oneline
# Replace this with the reviewed full commit hash after committing the cleanup.
BECOME_COMMIT=REPLACE_WITH_FULL_COMMIT_HASH
git archive --format=tar --output=/tmp/become-release.tar "$BECOME_COMMIT"
shasum -a 256 /tmp/become-release.tar
scp /tmp/become-release.tar YOUR_SSH_USER@YOUR_VPS_IP:/tmp/become-release.tar
```

SSH preserves transport confidentiality/integrity; the checksum lets you confirm the exact archive. This method does not put a GitHub private key or token in the application account.

**VPS:**

```bash
sha256sum /tmp/become-release.tar
BECOME_COMMIT=$(git get-tar-commit-id < /tmp/become-release.tar)
[[ "$BECOME_COMMIT" =~ ^[0-9a-f]{40}$ ]] || { echo 'Invalid release commit'; exit 1; }
BECOME_RELEASE="/srv/apps/become/releases/$BECOME_COMMIT"
test ! -e "$BECOME_RELEASE" || { echo 'Release already exists: inspect it first'; exit 1; }
sudo install -d -o become -g become -m 0750 "$BECOME_RELEASE"
sudo -u become tar -xf /tmp/become-release.tar -C "$BECOME_RELEASE"
printf '%s\n' "$BECOME_COMMIT" | sudo -u become tee "$BECOME_RELEASE/RELEASE_COMMIT" > /dev/null
```

Compare the checksum with the Mac output. Then install from the lockfile and build. Build-time dev dependencies include TypeScript, Prisma, and Tailwind, so explicitly retain them. Do not disable pnpm's signature or supply-chain checks if installation fails.

```bash
sudo -u become env PATH=/opt/become-node/bin:/usr/bin:/bin bash -s -- "$BECOME_RELEASE" <<'BUILD'
set -euo pipefail
cd "$1"
set -a
source /etc/become/production.env
set +a
pnpm install --frozen-lockfile --prod=false
pnpm db:generate
pnpm lint
pnpm build
pnpm typecheck
BUILD
```

Building does not run migrations or import your personal data. The signup page reads runtime configuration dynamically. Watch memory with `free -h` and existing-service health during the first CPX22 build. Do not add swap, resize the VPS, or change Auctus's limits blindly if capacity is insufficient; stop the build and schedule adequate capacity. A failure leaves the current release untouched.

## 7. Verify persistent media and install the process service

**VPS:**

```bash
sudo -u become test -r /etc/become/production.env
sudo -u become test -w /srv/data/become/media
sudo -u become test ! -r /etc/become/maintenance.env
sudo stat -c '%U:%G %a %n' /srv/data/become /srv/data/become/media /etc/become/production.env
sudo -u become sh -c 'umask 077; p=$(mktemp /srv/data/become/media/.permission-check.XXXXXX); printf check > "$p"; test -s "$p"; rm "$p"'
```

Expected: `become:become 700` data directories and `root:become 640` runtime env. Uploads are served only by authenticated routes that verify the user's ownership. Their responses use private/no-store caching. Backups must include **all** media subtrees: Seasons and COTS selections/previews, Content thumbnails, and script images. Do not delete files by age or assume that every old image is unused.

Install the service and the active release link, but do not start it until section 11 has migrated the database:

```bash
sudo install -o root -g root -m 0644 "$BECOME_RELEASE/ops/production/become.service" /etc/systemd/system/become.service
sudo ln -s "$BECOME_RELEASE" /srv/apps/become/current
sudo systemctl daemon-reload
sudo systemd-analyze verify /etc/systemd/system/become.service
sudo systemctl enable become.service
```

The supplied service runs as `become`, binds loopback only, loads the env file, starts on boot, restarts after unexpected exits, and grants writes only to persistent media and the active `.next` directory. Graceful stop gets 45 seconds. A repeated startup failure eventually hits systemd's rate limit; inspect logs, fix the cause, then use `sudo systemctl reset-failed become` and start it again.

## 8. Domain, Caddy, and HTTPS

1. In your DNS provider, create an A record for your Become subdomain pointing to the VPS IPv4 address. Add AAAA only if the server's IPv6 routing/firewall actually works. Remove stale/conflicting records. For initial setup, use direct DNS (no extra CDN/proxy layer).
2. Check `dig +short become.example.com A` and `dig +short become.example.com AAAA` from your Mac. They must match the intended VPS.
3. Identify the process already serving 80/443. If it is the existing system Caddy, add **one new independent site block**. There can only be one listener for each public IP/port; a second Caddy instance cannot simply compete for 80/443. If Auctus uses containerized Caddy or a different proxy, the incoming routing must be adapted to that actual arrangement before continuing. Do not stop it to make room.
4. If no proxy is installed/running, install Caddy using the [official Debian/Ubuntu instructions](https://caddyserver.com/docs/install#debian-ubuntu-raspbian). Do not reinstall or globally upgrade an existing working proxy as part of this guide.
If step 4 applies (no existing proxy), the official package installation is:

```bash
sudo apt-get install debian-keyring debian-archive-keyring apt-transport-https gnupg
curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update
sudo apt-get install caddy
caddy version
```

5. Inspect the active Caddy service's actual config path from section 3. The commands here assume `/etc/caddy/Caddyfile`. Back it up, edit it, and **append** the prepared site block from `ops/production/Caddyfile.example`. Keep all existing sites and global settings.

```bash
sudo cp -a /etc/caddy/Caddyfile "/etc/caddy/Caddyfile.before-become-$(date -u +%Y%m%dT%H%M%SZ)"
sudo nano /etc/caddy/Caddyfile
```

Replace `become.example.com` and the bootstrap IP `192.0.2.10` in the example. The bootstrap IP must be the public source address of your own browser connection (VPN changes it). Allow both your actual IPv4 and IPv6 if needed. Keep this restriction until signup is closed again. It is local to the Become site, so it does not restrict another hosted app.

The block limits bodies to 8 MB (the app's image limit is 6 MiB), adds baseline headers, and forwards to loopback. The Caddy instance must be version 2.10+ for this request-body directive. Validate the **whole existing config** before reload:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo systemctl reload caddy
sudo systemctl status caddy --no-pager
```

Caddy obtains and renews certificates and redirects HTTP to HTTPS when DNS and incoming 80/443 work. Do not run Certbot separately. Do not add broad wildcard trusted origins or disable CSRF checks to solve a proxy mismatch. The example assumes Caddy is the internet-facing proxy and overwrites forwarded headers; adding Cloudflare or another upstream proxy requires a separate trusted-proxy review. [Automatic HTTPS](https://caddyserver.com/docs/automatic-https), [Caddy reloads](https://caddyserver.com/docs/running), [request limits](https://caddyserver.com/docs/caddyfile/directives/request_body)

CSP with strict nonces is not configured for HTML in this release. Do not paste a restrictive generic CSP into Caddy without testing the rich editor, Next inline scripts and printing. The app sanitizes imported content and restricts links; media responses have their own restrictive policy. Add HSTS only after HTTPS is verified; do not use `includeSubDomains` or preload for an unrelated parent domain.

## 9. Firewall and host security

Use SSH keys and keep your existing SSH session open while testing a second login. Record the actual SSH port from `sudo sshd -T | grep '^port '`. Do not assume it is 22. Ensure console/recovery access in Hetzner is available before changing firewall or SSH settings.

Review **both** the Hetzner Cloud Firewall and the current host firewall. Preserve every legitimate existing rule needed by Auctus or other services. For Become, permit inbound TCP 80/443 publicly and your actual SSH port from your administrator IP/VPN. UDP 443 is optional for HTTP/3. Do not allow 3010, 5432, Prisma Studio, or Caddy's admin port publicly. Allow outbound HTTPS/DNS and PostgreSQL TCP 5432 to Neon; backup storage needs outbound SSH port 23 in the Storage Box example.

If UFW is already active, add only missing Become web rules:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status numbered
sudo ss -ltnp
```

Do **not** run `ufw reset` or blindly `ufw enable` on the shared VPS. If it is currently disabled, first inventory and explicitly allow all existing services and the real SSH port before a separate activation. Docker-published ports can bypass assumptions about UFW; inspect container port mappings too. Become needs no production Docker ports.

Do not expose Prisma Studio in production. Keep Neon, DNS, GitHub, SSH and backup credentials separate and enable MFA on the control-plane accounts. Maintain OS and app security updates on a schedule; a clean dependency audit today is not a permanent guarantee. Auth uses production rate limiting in memory in this single process; counters reset on restart. Public self-service registration, email verification, and password-reset delivery are not configured. Use a strong password manager-held owner password and closed registration for this first personal deployment.

## 10. Back up the database and media together

A PostgreSQL dump alone cannot restore uploaded images. A VPS snapshot alone cannot restore Neon. Use matched sets made while **all Become writers are stopped**. The provided backup stops only `become.service`, dumps PostgreSQL, archives media, verifies archive structure/checksums, and restarts Become even after failures. When both Restic settings are configured in `/etc/become/backup.env`, it also sends an encrypted copy off the VPS; a failed offsite copy fails the backup. Expect a short nightly interruption; an active timer's persisted state survives, but avoid editing during the window. Do not run Prisma Studio, migrations, manual writes, or a second app process during a backup.

The current local-only setup does not protect against losing the VPS. One future offsite option is a **separate Hetzner Storage Box** (an additional purchase). You can substitute another supported Restic destination. Keep credentials and encryption password outside the VPS in your password manager. A backup is not validated until a restore has been tested. The Restic steps below are optional until an offsite destination is available.

For the Storage Box option:

1. Create a dedicated box/subaccount for Become backups; enable SSH access in Hetzner. Obtain its username/hostname.
2. **VPS:** generate a dedicated root SSH key and install its public key. Verify the remote host fingerprint before accepting it. The following uses Storage Box's port 23 SFTP subsystem:

```bash
sudo install -d -o root -g root -m 0700 /root/.ssh
sudo ssh-keygen -t ed25519 -f /root/.ssh/become_backup -N '' -C become-backup
sudo ssh-copy-id -p 23 -s -i /root/.ssh/become_backup.pub YOUR_BOX_USER@YOUR_BOX_HOST
sudo nano /root/.ssh/config
```

Append this alias; preserve existing SSH config:

```sshconfig
Host become-backup
    HostName YOUR_BOX_HOST
    User YOUR_BOX_USER
    Port 23
    IdentityFile /root/.ssh/become_backup
    IdentitiesOnly yes
    BatchMode yes
```

[Hetzner SSH setup](https://docs.hetzner.com/storage/storage-box/backup-space-ssh-keys/), [Restic repository setup](https://restic.readthedocs.io/en/stable/030_preparing_a_new_repo.html)

3. Create the root-only backup configuration and password:

```bash
sudo install -o root -g root -m 0600 "$BECOME_RELEASE/ops/production/backup.env.example" /etc/become/backup.env
sudo sh -c 'umask 077; openssl rand -hex 32 > /etc/become/restic-password'
sudo nano /etc/become/restic-password
```

Save that password in your password manager; closing the editor must not change it accidentally. The template uses `RESTIC_REPOSITORY='sftp:become-backup:become'` and `RESTIC_PASSWORD_FILE='/etc/become/restic-password'`. Initialize this **new dedicated repository once**:

```bash
sudo bash <<'BACKUP_INIT'
set -euo pipefail
set -a
source /etc/become/backup.env
set +a
restic init
restic snapshots
BACKUP_INIT
```

4. Install the backup command and timer; run the first backup after section 11 has started the app:

```bash
sudo install -o root -g root -m 0750 "$BECOME_RELEASE/ops/production/become-backup.sh" /usr/local/sbin/become-backup
sudo install -o root -g root -m 0644 "$BECOME_RELEASE/ops/production/become-backup.service" /etc/systemd/system/become-backup.service
sudo install -o root -g root -m 0644 "$BECOME_RELEASE/ops/production/become-backup.timer" /etc/systemd/system/become-backup.timer
sudo systemctl daemon-reload
sudo systemd-analyze verify /etc/systemd/system/become-backup.service /etc/systemd/system/become-backup.timer
```

After that first successful backup and restore rehearsal:

```bash
sudo systemctl enable --now become-backup.timer
sudo systemctl list-timers become-backup.timer
```

It runs at **03:30 UTC** daily; persistent timers catch up after a missed boot-time run. Change the schedule if it conflicts with your working hours. Each set contains `database.dump`, `media.tar.gz`, a release commit, Next BUILD_ID, and SHA256SUMS. Configuration secrets are deliberately excluded; preserve them separately. The script never deletes older backups automatically.

Choose an initial retention policy: seven daily, four weekly, and six monthly offsite copies, plus the last seven verified local sets. **Weekly**, inspect failures and free disk space, run `restic snapshots` and `restic check`, and preview retention before applying it:

```bash
sudo bash <<'RETENTION_PREVIEW'
set -euo pipefail
set -a
source /etc/become/backup.env
set +a
restic snapshots
restic check
restic forget --tag become --group-by host,tags --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --dry-run
RETENTION_PREVIEW
```

After reviewing the preview and testing recovery, run the same `forget` with `--prune` in place of `--dry-run`. Each backup path contains a timestamp, so `--group-by host,tags` is essential for retention across sets. Remove an old **explicitly named** local set only after verifying its offsite snapshot and a newer successful backup. Never use an unreviewed wildcard delete. Monitor disk usage; a no-deletion policy needs human retention work. Alert on `become-backup.service` failures using your host monitoring, and regularly check `systemctl --failed`. Nothing here claims that alert delivery is already configured.

## 11. Apply the first production migration and create the owner

Before starting: verify the selected Neon database is empty, the owner URL is correct, and the release hash is the one you built. Neon production must not contain your test schemas. These commands intentionally load maintenance credentials only in the root-controlled maintenance process.

**VPS:**

```bash
sudo env PATH=/opt/become-node/bin:/usr/bin:/bin bash -s -- "$BECOME_RELEASE" <<'MIGRATE'
set -euo pipefail
cd "$1"
set -a
source /etc/become/maintenance.env
set +a
export PGDATABASE="$DIRECT_DATABASE_URL"
psql -X -v ON_ERROR_STOP=1 -c 'SELECT current_database(), current_user(), version();'
psql -X -v ON_ERROR_STOP=1 -c "SELECT count(*) AS existing_tables FROM pg_tables WHERE schemaname='public';"
# Expect zero existing application tables on the FIRST deployment.
# If it is not empty, stop and investigate before running the next block.
MIGRATE
```

Only after inspecting that output:

```bash
sudo env PATH=/opt/become-node/bin:/usr/bin:/bin bash -s -- "$BECOME_RELEASE" <<'MIGRATE'
set -euo pipefail
exec 9>/run/lock/become-maintenance.lock
flock -n 9
cd "$1"
set -a
source /etc/become/maintenance.env
set +a
export DATABASE_URL="$DIRECT_DATABASE_URL"
./node_modules/.bin/prisma migrate deploy
# Use an explicit executable: this is a maintenance shell, not pnpm's script PATH.
./node_modules/.bin/tsx prisma/seed.ts --reference-data-only
./node_modules/.bin/prisma migrate status
export PGDATABASE="$DIRECT_DATABASE_URL"
psql -X -v ON_ERROR_STOP=1 <<'SQL'
GRANT USAGE ON SCHEMA public TO become_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO become_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO become_app;
ALTER DEFAULT PRIVILEGES FOR ROLE become_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO become_app;
ALTER DEFAULT PRIVILEGES FOR ROLE become_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO become_app;
REVOKE ALL ON TABLE public._prisma_migrations FROM become_app;
SQL
MIGRATE
```

The current history contains **38 migrations**. Expect `Database schema is up to date!`. Reference sync creates no demo account. The application role gets ordinary data access, not schema-change rights. Default grants assume future migrations also run as `become_owner`.

Now temporarily enable controlled registration:

1. Confirm the Caddy bootstrap IP restriction is active and excludes other visitors.
2. Edit `/etc/become/production.env`: change only `BECOME_ALLOW_SIGNUP` to `'true'`.
3. Start Become:

```bash
sudo systemctl start become
sudo systemctl status become --no-pager
sudo journalctl -u become -n 80 --no-pager
curl -I http://127.0.0.1:3010/sign-in
```

4. Visit **https://your-become-domain/sign-in** from the allowed browser and create your owner account. Save its password. Default domains are created automatically. Opening the current Season is optional.
5. Set `BECOME_ALLOW_SIGNUP='false'` again, then `sudo systemctl restart become`. Refresh in a private window: the create-account switch must be absent, and your existing account must still sign in.
6. Remove only the two bootstrap matcher/respond lines from Become's Caddy block. Validate the whole config and reload Caddy again. Other site blocks remain unchanged.
7. Run the first paired/offsite backup: `sudo systemctl start become-backup.service`. Check `sudo journalctl -u become-backup -n 80 --no-pager` and the Restic snapshot list. Do section 14's rehearsal before relying on it.

If the app returns 500, inspect its journal for missing env values, Neon credentials/SSL, missing migrations, or media permissions. Do not turn off auth, SSL or origin checks to get past an error.

## 12. Production smoke tests

Run these after initial setup and every deployment:

1. `curl -I http://your-domain` redirects to HTTPS; `curl -I https://your-domain/sign-in` returns 200 with a valid certificate and baseline security headers. Test from outside the VPS too.
2. `sudo ss -ltnp` shows Next only on `127.0.0.1:3010`. Direct public port 3010 is unreachable. Caddy's admin listener is not public.
3. In a private window, `/` redirects to sign-in; private API/media URLs do not disclose records. Signup UI is absent. A direct registration request fails:

```bash
curl -i 'https://become.example.com/api/auth/sign-up/email' \
  -H 'Origin: https://become.example.com' -H 'Content-Type: application/json' \
  --data '{"name":"Must not be created","email":"closed-signup@example.test","password":"unused-smoke-password"}'
```

Expect a non-2xx response indicating signup is disabled. If it succeeds, close signup immediately and inspect the unexpected account; do not continue public launch.

4. Sign in with your real account, try an incorrect password first, and verify retry works. In browser developer tools, verify the session cookie is Secure, HttpOnly, and SameSite. Sign out and sign back in.
5. Start a clearly labeled short test session; pause, refresh, resume and finish it. Confirm time, date and Europe/Amsterdam boundaries. The test is a real explicit production record; don't run automatic fixture scripts to remove it.
6. Create one clearly labeled Content item, upload a small still image, reload and view it. Check a Season poster and script image if you use those features. Confirm files appear under `/srv/data/become/media`, never inside the release. Copy an image URL into a private window; it should require authentication. User-scoped queries must not reveal another user's image.
7. Save a small edit in Engineering/Finance/Direction/Content, open Reviews, and verify readable source links. Do not create fictitious income as a silent smoke fixture; any production test data should be deliberate and clearly labeled.
8. Restart **only Become** with `sudo systemctl restart become`. Sign in again if needed; confirm the same uploaded image and saved records remain. Check desktop and phone layouts, rich editor autosave, and browser console/server errors.
9. `sudo systemctl is-enabled become`, `sudo systemctl status become-backup.timer`, and `sudo systemctl --failed` should show the intended state. A full VPS reboot affects Auctus too; schedule that shared reboot separately if you want to prove boot recovery.
10. Complete a backup and an isolated restore rehearsal. Valid archive listings/checksums alone do not prove application recovery.

## 13. Future update/deploy procedure

Use a short maintenance window. Building an inactive release does not require downtime. Migrations and the release switch do. Keep at least the previous working release, its runtime version, and its paired backup.

1. **LOCAL:** review the change and all new migrations, run lint/build/typecheck/tests against a disposable database, and run `pnpm audit`. Commit, choose the full new hash, archive, transfer and build it using section 6. Do not rebuild inside `current`.
2. Read each new migration. Rehearse it against a restored production backup/isolated Neon branch if it changes existing data or constraints. Decide whether the old app remains compatible with the new schema; record that rollback decision before proceeding.
3. **VPS:** run `sudo systemctl start become-backup.service`, verify the completed local/offsite set and note its timestamp. Disable the timer temporarily with `sudo systemctl stop become-backup.timer` to avoid a scheduled run during deployment.
4. Record the old release: `readlink -f /srv/apps/become/current`. Then open a root maintenance shell and hold the shared lock:

```bash
sudo env PATH=/opt/become-node/bin:/usr/bin:/bin bash
set -euo pipefail
exec 9>/run/lock/become-maintenance.lock
flock -n 9
BECOME_NEW_RELEASE=/srv/apps/become/releases/REPLACE_WITH_NEW_FULL_COMMIT
BECOME_OLD_RELEASE=$(readlink -f /srv/apps/become/current)
test -f "$BECOME_NEW_RELEASE/.next/BUILD_ID"
test -f "$BECOME_NEW_RELEASE/RELEASE_COMMIT"
systemctl stop become
cd "$BECOME_NEW_RELEASE"
set -a
source /etc/become/maintenance.env
set +a
export DATABASE_URL="$DIRECT_DATABASE_URL"
./node_modules/.bin/prisma migrate deploy
./node_modules/.bin/tsx prisma/seed.ts --reference-data-only
./node_modules/.bin/prisma migrate status
```

If any command fails, leave Become stopped and follow section 14; do not automatically restart an old application against an unknown partially migrated schema. Existing default grants give the runtime role access to new tables created by the owner; review grants when a migration introduces new schemas or roles.

5. Only after successful migrations, switch the symlink atomically **inside the same maintenance shell**:

```bash
ln -s "$BECOME_NEW_RELEASE" /srv/apps/become/current.next
mv -Tf /srv/apps/become/current.next /srv/apps/become/current
systemctl start become
systemctl status become --no-pager
exit
```

If `current.next` already exists, inspect it rather than overwriting an unknown file. The service resolves the new `.next` write allowance when it restarts. The media root and auth secret do not move.

6. Run section 12's smoke tests. Refresh old browser tabs after deployment; server-action identifiers and assets change between builds. If ops templates changed, review their diffs and install the updated service/backup files deliberately; run `daemon-reload` for unit changes. Do not replace shared Caddy config wholesale.
7. Re-enable scheduling with `sudo systemctl start become-backup.timer`. Make a post-deploy backup. Keep the previous release until the new one and its backup are proven. Delete only explicitly reviewed old releases; retain enough disk space for the next build.

## 14. Rollback, recovery, and restore rehearsal

### Application-only rollback

A previous release is safe only if it is compatible with the **current** database schema and media format. A code rollback does not undo a migration. If compatible, stop the backup timer, hold `/run/lock/become-maintenance.lock` as in section 13, stop Become, set `current.next` to the recorded old release, atomically move it over `current`, and restart Become. Run smoke tests and resume the timer. Do not delete the failed release until logs are inspected.

### Migration failure

Keep the app stopped. Capture `prisma migrate status` and relevant logs. Do not edit old migration files, delete `_prisma_migrations` rows, use `migrate reset`, or run `migrate resolve` merely to silence the error. Migrations are not automatically reversible, and partially executed SQL may require a reviewed forward correction. Restore to a **new empty database** from the pre-deploy backup when forward repair is unclear. Do not overwrite the sole remaining copy of production while investigating.

### Paired restore to a new database and media directory

This is also the rehearsal you must complete before relying on backups. Restoring an older set loses writes after its timestamp; preserve the current state first and explicitly choose the recovery point. Neon point-in-time restore can help recover database mistakes within the configured history window, but you still need matching media. A newer DB paired with older media can contain broken references. [Neon restore behavior](https://neon.com/blog/announcing-point-in-time-restore)

1. Stop the backup timer and all Become writers for an actual cutover. For a rehearsal, use separate ports/config/directories and keep production running. Hold the maintenance lock during an actual recovery.
2. Choose a successful backup timestamp and its matching release hash. If the VPS was lost, rebuild only Become's dedicated paths/runtime on the replacement server, recover the root backup credentials from your password manager, then fetch the exact Restic snapshot into a staging directory:

```bash
sudo bash <<'FETCH_BACKUP'
set -euo pipefail
set -a
source /etc/become/backup.env
set +a
restic snapshots --tag become
# Replace the snapshot ID; the destination is a NEW staging directory.
restic restore REPLACE_WITH_SNAPSHOT_ID --target /srv/backups/become/recovery-staging
FETCH_BACKUP
```

Restic preserves absolute source paths beneath the target. Locate the chosen set under `recovery-staging/srv/backups/become/<timestamp>` and verify `sha256sum -c SHA256SUMS` **from that directory**. Also run `pg_restore --list database.dump` and `tar -tzf media.tar.gz`.

3. In Neon, create a new **empty** recovery database (for example `become_recovery_20260913`) owned by `become_owner`. Do not create a branch inheriting all production tables and then restore the dump on top. Keep the original production database intact. Save its direct recovery connection in a new root-only `/etc/become/recovery.env` as `RECOVERY_DATABASE_URL='postgresql://.../become_recovery_20260913?sslmode=verify-full&channel_binding=require'` plus `PGSSLROOTCERT`.
4. Restore the database without replaying migrations over the dump first; the dump already contains its migration history:

```bash
sudo bash
set -euo pipefail
set -a
source /etc/become/recovery.env
set +a
export PGDATABASE="$RECOVERY_DATABASE_URL"
BECOME_BACKUP_SET=/srv/backups/become/REPLACE_WITH_VERIFIED_TIMESTAMP
psql -X -v ON_ERROR_STOP=1 -c 'SELECT current_database(), current_user();'
# Confirm the output is the NEW recovery database before the next command.
# Stream the restored SQL into psql, which reads PGDATABASE from the environment.
# pipefail and ON_ERROR_STOP make either side fail the command on errors.
pg_restore --exit-on-error --no-owner --no-acl --file=- "$BECOME_BACKUP_SET/database.dump" | psql -X -v ON_ERROR_STOP=1
exit
```

Restore once into the empty recovery database. Grant database CONNECT and schema/table/sequence access plus owner default privileges in the recovery DB as in sections 1 and 11, and revoke app access to `_prisma_migrations` again. Confirm the runtime role can connect to the new database.

5. Extract media into a **new** staging root, keeping the existing media intact:

```bash
sudo install -d -o become -g become -m 0700 /srv/data/become-restore
sudo tar --no-same-owner -xzf /srv/backups/become/REPLACE_WITH_VERIFIED_TIMESTAMP/media.tar.gz -C /srv/data/become-restore
sudo chown -R become:become /srv/data/become-restore
sudo find /srv/data/become-restore -type d -exec chmod 0700 {} +
sudo find /srv/data/become-restore -type f -exec chmod 0600 {} +
```

For an offsite-recovered set, substitute the actual staging backup path. Use only your verified backup archive. This is not an instruction to untar unknown archives as root.

6. Test the matching release against the recovered database/media with a separate env file and unused loopback port. Preserve `NODE_ENV=production`, a distinct HTTPS test hostname and corresponding Caddy bootstrap restriction; keep registration disabled. An isolated service must have its own name, WorkingDirectory, env path, port and `ReadWritePaths=/srv/data/become-restore .../.next`. Do not point the real `become.service` at it for a rehearsal. Verify login, record counts, reviews, uploads, missing-image errors and restart persistence. The test account/password must exist in the chosen backup. Do not run disposable-fixture test suites against recovered personal data.
7. For an actual recovery after validation: keep Become stopped, preserve the old data root by renaming it to a timestamped recovery holding directory, move `/srv/data/become-restore` to `/srv/data/become`, point the runtime URL and maintenance URL at the recovered database, and point `current` at the matching tested release. Update default grants and, if necessary, certificate/domain settings. Keep `BETTER_AUTH_SECRET` from the matched configuration.
8. Start Become, run smoke tests, verify the previous database/media remain available for investigation, and make a new offsite backup before resuming the timer. Record the restore timestamp and any accepted data loss. Rotate credentials if the incident involved compromise.

### Lost password / failed host / media-only failure

There is no configured email password reset. Preserve your owner password in a password manager. A password loss requires a controlled, separately reviewed account-recovery operation; never enable public signup as a substitute. A lost VPS requires both the offsite media/database set and the saved credentials/configuration. If only a media file is missing, restore that exact referenced key from a verified backup into staging first; do not globally replace media with an older set while live writes continue.

Review recovery at least monthly and after changes to schema, media handling or backup tooling. Record the measured recovery time and the chosen maximum acceptable loss of recent work.
