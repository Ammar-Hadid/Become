# Become PostgreSQL on nexo-vps

Become production switched from Neon to an empty self-hosted PostgreSQL database
on 28 October 2026. No application data was imported. Local development continues
to use the repository-root Docker Compose database on port 5432.

The VPS design follows Nexo School's dedicated PostgreSQL container and Auctus's
separation of application code, persistent data, and backups. Become has its own
container, network, credentials, and data directory; neither application's files
or services are changed.

## Installed layout

| Purpose | Location |
| --- | --- |
| Compose project / container | `become-postgresql` / `become-postgres` |
| Compose and initialization scripts | `/srv/apps/become/postgresql/` |
| Persistent database files | `/srv/data/become/postgresql/data/` |
| Network / host listener | `become-db` / `127.0.0.1:15433` |
| Database / maintenance role / runtime role | `become` / `become_owner` / `become_app` |
| Container initialization secrets | `/etc/become/postgres.env` (root, 0600) |
| Application URL | `/etc/become/production.env` (root:become, 0640) |
| Migration/backup URL | `/etc/become/maintenance.env` (root, 0600) |
| Startup unit | `become-postgres.service` |
| Web/worker ordering | `become.service.d/database.conf`, `become-bank-sync.service.d/database.conf` |
| Coordinated backups | `/srv/backups/become/<UTC timestamp>/` |

The image is PostgreSQL 17.11 pinned to the same digest as the existing Nexo School
installation. Limits are 512 MiB RAM (no container swap), half a CPU, 40 connections,
128 MiB shared buffers, and three rotated 10 MiB logs. The `postgresql/` parent is
root-owned, mode 0700; the container owns its `data/` child. This parent prevents
the host app from reading raw database files even when its UID matches the
container's PostgreSQL UID. The application does not connect as a superuser and cannot create
tables; migrations use a separate owner. The app cannot read `_prisma_migrations`.

Passwords use SCRAM authentication. PostgreSQL TLS is disabled only for this
host-local connection. No public PostgreSQL listener, proxy route, or firewall
exception is needed. For remote access, encrypt transport with SSH:

```bash
ssh -N -L 127.0.0.1:15434:127.0.0.1:15433 nexo-vps
```

Use the appropriate database role through local port 15434. Do not point local
development, test runners, `migrate dev`, or `db push` at production.

## Reproduce on a fresh Become installation

These are root operations on the VPS after creating the Become account and base
directories in [the deployment guide](PRODUCTION.md#3-inspect-the-vps-and-create-dedicated-directories).
Docker and Compose must already be installed. Confirm port 15433, the container
name, network name, and destination paths are unused. Do not rerun initialization
against an existing installation or delete its data to make initialization run.

1. Copy `ops/production/postgresql/` to `/srv/apps/become/postgresql/`, owned by root,
   with the directory mode 0700 and `init-roles.sh` executable. Create the empty
   `/srv/data/become/postgresql/` parent and its empty `data/` child, root-owned,
   mode 0700. The official image sets only the child's final ownership when it
   initializes. Keep the parent root-owned and inaccessible to the app account.
2. Run `python3 /srv/apps/become/postgresql/prepare-env.py`. It creates three
   root-only files with independent random administrator, owner, and app passwords.
   It refuses existing credential files and does not change the running app URL.
3. Install `ops/production/become-postgres.service` as
   `/etc/systemd/system/become-postgres.service` (root, 0644), then run:

   ```bash
   cd /srv/apps/become/postgresql
   docker compose config --quiet
   systemctl daemon-reload
   systemctl enable --now become-postgres.service
   docker compose ps
   ```

4. Install `ops/production/become-pg-connection.sh` at
   `/usr/local/sbin/become-pg-connection` (root, 0640). Initialize the schema from
   the exact release that will run. This step writes only to the new database:

   ```bash
   export PATH=/opt/become-node/bin:/usr/bin:/bin
   source /etc/become/postgres-maintenance.env
   export DATABASE_URL="$DIRECT_DATABASE_URL"
   cd /srv/apps/become/current
   ./node_modules/.bin/prisma migrate deploy
   ./node_modules/.bin/tsx prisma/seed.ts --reference-data-only
   ./node_modules/.bin/prisma migrate status
   source /usr/local/sbin/become-pg-connection
   become_set_pg_connection "$DIRECT_DATABASE_URL"
   psql -X -v ON_ERROR_STOP=1 -c 'REVOKE ALL ON TABLE public._prisma_migrations FROM become_app;'
   ```

5. For an existing app, hold `/run/lock/become-maintenance.lock`, stop its backup
   timer and all Become writers, and retain its previous environment files in a
   root-only recovery directory. Replace only `DATABASE_URL` in `production.env`
   with the line in `postgres-runtime.env`. Install `postgres-maintenance.env` as
   `maintenance.env`, root-owned, mode 0600. Preserve every unrelated runtime
   setting and the existing runtime file ownership/mode.
6. Install `postgresql/database.conf` into
   `/etc/systemd/system/become.service.d/database.conf` and the equivalent drop-in
   directory for each installed Become worker (root, 0644). This orders startup
   after database readiness. Reload systemd and start the previous active Become
   writers. Check the public `/api/health` and `/sign-in` endpoints.
7. Install the current `become-backup.sh` as `/usr/local/sbin/become-backup` (root,
   0750). It stops and restarts the active web, bank-sync, and Season-onboarding
   services. If another writer is introduced, add its actual service name to this
   script before relying on coordinated backups. Run `become-backup.service`,
   verify the set, rehearse restore, and resume the existing backup timer.
8. Remove the two temporary `postgres-runtime.env` and `postgres-maintenance.env`
   files after verification; active credentials now live in the canonical env
   files. Keep `postgres.env` for container recreation. Keep secrets out of logs,
   releases, Git, and command-line arguments.

The init script runs only on an empty data directory. Editing `postgres.env` later
does **not** rotate an existing role password: rotate through PostgreSQL and update
the corresponding application/maintenance/container credential together.

## Operations and recovery

```bash
ssh nexo-vps
# Run the following as root (or with the corresponding sudo access).
systemctl status become-postgres.service become.service become-bank-sync.service
docker inspect become-postgres --format '{{.State.Health.Status}}'
docker logs --tail 50 become-postgres
systemctl start become-backup.service
journalctl -u become-backup.service -n 20 --no-pager
```

Backups use the owner URL and existing PostgreSQL 18 client tools. They dump the
database and archive only `media/`, not the live PostgreSQL files. The maintenance
lock prevents overlap with deployment. Writers are stopped briefly; allow the web
process a few seconds to become ready after restart before checking public health.

The nightly timer is enabled. Offsite Restic storage is **not configured**, and
continuous WAL/PITR is not configured. Local backups protect against logical
mistakes but do not survive loss of the VPS. Existing backup sets are retained;
monitor disk capacity. Set up the existing optional Restic configuration before
relying on host-loss recovery.

Use [the restore procedure](PRODUCTION.md#14-rollback-recovery-and-restore-rehearsal)
to restore into a new database owned by `become_owner` and a separate media
directory. Do not move or replace `/srv/data/become` as a whole: it now also holds
the live database. Never restore on top of the running production database.

For maintenance, stop the timer and Become writers under the maintenance lock,
take a verified backup, then update only this Compose project's pinned image.
Use `docker compose up -d --wait` and start the writers again after verifying the
schema and health. Major PostgreSQL upgrades require a separate dump/restore or
`pg_upgrade` plan; never point a different major version at the existing files.
Do not prune Docker globally or restart Docker/Caddy/other applications.

## Cutover evidence — 28 October 2026

- The existing release remained `918d9b2489ef9bb243d31f079852528f15368f2c`.
- Its 53 migrations and built-in technology reference data initialized cleanly.
- The runtime role passed transactional insert/read/update/delete verification;
  no test account remained. Elevated role attributes and schema creation access
  are disabled, and access to migration history is denied.
- Public health returned `ok` and sign-in returned HTTP 200.
- Restarting the PostgreSQL container preserved all 53 migrations; application
  health recovered and both app processes reconnected using `become_app`.
- The coordinated backup at `20261028T012335Z` passed all file checksums and restored
  successfully into a separate temporary database: 53 migrations and zero users.
  The temporary database was removed afterward.
- Previous configuration and maintenance scripts are retained root-only in
  `/etc/become/database-cutover-20261028/`. They are a recovery reference, not active
  credentials. No Neon project was deleted.
- Registration remains disabled. An owner account must be created through the
  existing controlled bootstrap procedure before signing in to the empty database.

Reference behavior: [official PostgreSQL image](https://hub.docker.com/_/postgres)
and [PostgreSQL default privileges](https://www.postgresql.org/docs/17/sql-alterdefaultprivileges.html).
