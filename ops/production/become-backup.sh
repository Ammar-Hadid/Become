#!/bin/bash
# Root-owned installation: /usr/local/sbin/become-backup, mode 0750.
# Requires PostgreSQL client tools of the same major version as Neon (or newer).
set -Eeuo pipefail
umask 077
export PATH=/opt/become-node/bin:/usr/local/bin:/usr/bin:/bin
[[ $EUID -eq 0 ]] || { echo 'Run as root.' >&2; exit 1; }
if [[ ${BECOME_DEPLOY_LOCK_HELD:-} != 1 ]]; then
  exec 9>/run/lock/become-maintenance.lock
  flock -n 9 || { echo 'Another Become maintenance operation is running.' >&2; exit 1; }
fi
set -a
source /etc/become/maintenance.env
unset RESTIC_REPOSITORY RESTIC_PASSWORD_FILE
if [[ -f /etc/become/backup.env ]]; then
  source /etc/become/backup.env
fi
set +a
: "${DIRECT_DATABASE_URL:?Set the direct owner connection in maintenance.env}"
source /usr/local/sbin/become-pg-connection
become_set_pg_connection "$DIRECT_DATABASE_URL"
if [[ -n ${RESTIC_REPOSITORY:-} || -n ${RESTIC_PASSWORD_FILE:-} ]]; then
  : "${RESTIC_REPOSITORY:?Set the off-VPS repository in backup.env}"
  : "${RESTIC_PASSWORD_FILE:?Set the restic password file in backup.env}"
  test -r "$RESTIC_PASSWORD_FILE"
  command -v restic > /dev/null
  offsite_enabled=1
else
  offsite_enabled=0
fi
export PGCONNECT_TIMEOUT=30
export PGAPPNAME=become-backup
base=/srv/backups/become
stamp=$(date -u +%Y%m%dT%H%M%SZ)
partial="$base/$stamp.partial"
complete="$base/$stamp"
mkdir -m 0700 "$partial"
restart=0
cleanup() {
  local status=$?
  trap - EXIT
  if (( restart )); then
    systemctl start become.service || status=1
  fi
  if (( status != 0 )); then
    echo "Backup failed. Inspect $base and journalctl -u become-backup; a local set may exist, and no old backup was deleted." >&2
  fi
  exit "$status"
}
trap cleanup EXIT
if systemctl is-active --quiet become.service; then
  restart=1
  systemctl stop become.service
fi
# All writers must be stopped, including Studio, migration jobs and manual SQL.
pg_dump --format=custom --no-owner --no-acl --file="$partial/database.dump"
tar -czf "$partial/media.tar.gz" -C /srv/data/become media
readlink -f /srv/apps/become/current > "$partial/release.txt"
cat /srv/apps/become/current/RELEASE_COMMIT > "$partial/commit.txt"
cp /srv/apps/become/current/.next/BUILD_ID "$partial/BUILD_ID"
pg_restore --list "$partial/database.dump" > "$partial/database-contents.txt"
tar -tzf "$partial/media.tar.gz" > /dev/null
(cd "$partial" && sha256sum database.dump media.tar.gz commit.txt BUILD_ID release.txt > SHA256SUMS)
mv "$partial" "$complete"
if (( restart )); then
  systemctl start become.service
  restart=0
fi
printf 'Local backup complete: %s\n' "$complete"
if (( offsite_enabled )); then
  restic backup --tag become "$complete"
  printf 'Encrypted off-VPS copy complete.\n'
else
  printf 'Offsite backup is not configured; local backup retained on this VPS.\n'
fi
# No automatic deletion: establish and verify off-VPS retention first.
