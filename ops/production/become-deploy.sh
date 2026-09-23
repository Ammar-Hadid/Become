#!/bin/bash
# Root-owned installation: /usr/local/sbin/become-deploy, mode 0750.
set -Eeuo pipefail
umask 077
export PATH=/opt/become-node/bin:/usr/local/bin:/usr/sbin:/usr/bin:/bin
[[ $EUID -eq 0 ]] || { echo 'Run as root.' >&2; exit 1; }
commit=${1:-}
run=${2:-}
upload=${3:-}
[[ $commit =~ ^[0-9a-f]{40}$ && $run =~ ^[0-9]+-[0-9]+$ ]] || {
  echo 'Expected full commit and numeric run-attempt identifier.' >&2; exit 1;
}
[[ $upload =~ ^/home/ammar/\.become-deploy\.[A-Za-z0-9]+\.tar$ ]] || {
  echo 'Invalid upload path.' >&2; exit 1;
}
[[ -f $upload && ! -L $upload && $(stat -c %U "$upload") == ammar ]] || {
  echo 'Upload must be a regular ammar-owned file.' >&2; exit 1;
}
base=/srv/apps/become
releases=$base/releases
current=$base/current
[[ -d $releases && ! -L $releases && -L $current ]] || {
  echo 'Existing Become release layout is not ready.' >&2; exit 1;
}
exec 9>/run/lock/become-maintenance.lock
flock -n 9 || { echo 'Another Become maintenance operation is running.' >&2; exit 1; }
old=$(readlink -f "$current")
[[ $old == "$releases/"* && -f $old/RELEASE_COMMIT && -f $old/.next/BUILD_ID ]] || {
  echo 'Cannot identify the current working Become release.' >&2; exit 1;
}
release=$releases/$commit-$run
[[ ! -e $release && ! -L $release ]] || {
  echo "Release already exists: $release. Use a new workflow run attempt." >&2; exit 1;
}
[[ ! -e $base/current.next && ! -L $base/current.next ]] || {
  echo 'Unexpected current.next exists; inspect it before deploying.' >&2; exit 1;
}
[[ -x /usr/local/sbin/become-backup ]] && grep -q BECOME_DEPLOY_LOCK_HELD /usr/local/sbin/become-backup || {
  echo 'Install the current Become backup script before deploying.' >&2; exit 1;
}
[[ -r /etc/become/production.env && -r /etc/become/maintenance.env ]] || {
  echo 'Become production and maintenance configuration is required.' >&2; exit 1;
}
[[ -d /srv/data/become/media && ! -L /srv/data/become ]] || {
  echo 'Persistent Become media directory is missing or unsafe.' >&2; exit 1;
}

# Copy into the private, root-owned Become tree before verifying and extracting.
install -d -o root -g become -m 0750 "$base/incoming"
archive=$base/incoming/$commit-$run.tar
[[ ! -e $archive ]] || { echo 'Incoming archive already exists.' >&2; exit 1; }
install -o root -g become -m 0640 "$upload" "$archive"
trap 'rm -f -- "$archive"' EXIT
[[ $(stat -c %s "$archive") -le 104857600 ]] || { echo 'Archive exceeds 100 MiB.' >&2; exit 1; }
embedded=$(git get-tar-commit-id < "$archive")
[[ $embedded == "$commit" ]] || { echo 'Archive commit does not match workflow commit.' >&2; exit 1; }
echo "Deploying commit $commit as $run; previous release: $old"
install -d -o become -g become -m 0750 "$release"
runuser -u become -- tar -xf "$archive" -C "$release" --no-same-owner --no-same-permissions
[[ ! -e $release/RELEASE_COMMIT && ! -L $release/RELEASE_COMMIT && ! -e $release/RELEASE_INFO && ! -L $release/RELEASE_INFO ]] || {
  echo 'Archive unexpectedly contains release metadata.' >&2; exit 1;
}
runuser -u become -- bash -c 'printf "%s\n" "$2" > "$1/RELEASE_COMMIT"; printf "release=%s\ncommit=%s\ndeployed_at=%s\n" "$3" "$2" "$4" > "$1/RELEASE_INFO"' _ "$release" "$commit" "$run" "$(date -u +%FT%TZ)"
echo 'Installing, generating Prisma client, and building inactive release'
runuser -u become -- env PATH=/opt/become-node/bin:/usr/bin:/bin bash -c '
  set -Eeuo pipefail
  cd "$1"
  set -a; source /etc/become/production.env; set +a
  pnpm install --frozen-lockfile --prod=false
  pnpm db:generate
  pnpm build
' _ "$release"
[[ -s $release/.next/BUILD_ID ]] || { echo 'Build ID missing.' >&2; exit 1; }

set -a; source /etc/become/maintenance.env; set +a
: "${DIRECT_DATABASE_URL:?Missing direct maintenance database URL}"
export PGDATABASE="$DIRECT_DATABASE_URL" PGCONNECT_TIMEOUT=30 PGAPPNAME=become-deploy
applied=$(psql -X -A -t -v ON_ERROR_STOP=1 -c 'SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL')
failed_migrations=$(psql -X -A -t -v ON_ERROR_STOP=1 -c 'SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL')
[[ $failed_migrations == 0 ]] || { echo 'Prisma has unresolved failed migrations; inspect before deployment.' >&2; exit 1; }
for sql in "$release"/prisma/migrations/*/migration.sql; do
  [[ -f $sql ]] || { echo 'No committed migrations found.' >&2; exit 1; }
  name=${sql%/migration.sql}; name=${name##*/}
  if ! grep -Fxq "$name" <<< "$applied"; then
    if tr '\n' ' ' < "$sql" | grep -Eiq '(DROP[[:space:]]+(TABLE|COLUMN)|TRUNCATE([[:space:]]|;)|DELETE[[:space:]]+FROM)'; then
      echo "Pending migration $name contains destructive SQL. Review and deploy manually." >&2
      exit 1
    fi
  fi
done

echo 'Creating coordinated database and media backup'
BECOME_DEPLOY_LOCK_HELD=1 /usr/local/sbin/become-backup
echo 'Backup complete; stopping Become for migration and switch'
systemctl stop become.service || {
  echo 'Could not stop Become cleanly; attempting to restore the existing service.' >&2
  systemctl start become.service || echo 'Become restart failed; inspect the service immediately.' >&2
  exit 1
}
maintenance_started=1
migrated=0
switched=0
health() {
  local expected=$1 body
  for ((attempt=1; attempt<=30; attempt++)); do
    body=$(curl -fsS --max-time 4 http://172.23.0.1:3010/api/health 2>/dev/null || true)
    if [[ $body == *'"status":"ok"'* && $body == *"\"commit\":\"$expected\""* ]]; then
      return 0
    fi
    sleep 2
  done
  return 1
}
old_health() {
  if [[ -f $old/src/app/api/health/route.ts ]]; then
    health "$(cat "$old/RELEASE_COMMIT")"
  else
    echo 'Previous release has no health endpoint; checking its sign-in response.' >&2
    for ((attempt=1; attempt<=30; attempt++)); do
      if systemctl is-active --quiet become.service &&
        [[ $(curl -sS -o /dev/null -w '%{http_code}' --max-time 4 http://172.23.0.1:3010/sign-in 2>/dev/null || true) == 200 ]]; then
        return 0
      fi
      sleep 2
    done
    return 1
  fi
}
on_exit() {
  local result=$?
  trap - EXIT
  if (( result != 0 && maintenance_started )); then
    if [[ -L $base/current.next && $(readlink "$base/current.next") == "$release" ]]; then
      rm -f -- "$base/current.next"
    fi
    if (( migrated )); then
      echo 'Deployment failed after migration; restoring previous application release.' >&2
      if (( switched )); then
        ln -s "$old" "$base/current.rollback.$$" && mv -Tf "$base/current.rollback.$$" "$current" || {
          echo 'ROLLBACK FAILED: inspect current symlink and Become service immediately.' >&2
          exit 1
        }
      fi
      systemctl reset-failed become.service || true
      if systemctl start become.service && old_health; then
        echo "Previous release is healthy: $old" >&2
      else
        echo 'ROLLBACK HEALTH FAILED: previous release did not recover; inspect service and schema.' >&2
      fi
    else
      echo 'Migration failed or is uncertain. Become remains stopped; inspect Prisma status and backup before recovery.' >&2
    fi
  fi
  rm -f -- "$archive"
  exit "$result"
}
trap on_exit EXIT
cd "$release"
echo 'Applying committed Prisma migrations and reference data'
DATABASE_URL="$DIRECT_DATABASE_URL" ./node_modules/.bin/prisma migrate deploy
DATABASE_URL="$DIRECT_DATABASE_URL" ./node_modules/.bin/tsx prisma/seed.ts --reference-data-only
DATABASE_URL="$DIRECT_DATABASE_URL" ./node_modules/.bin/prisma migrate status
migrated=1
echo 'Switching Become current release'
ln -s "$release" "$base/current.next"
mv -Tf "$base/current.next" "$current"
switched=1
systemctl reset-failed become.service || true
systemctl start become.service
echo 'Checking application and database health'
health "$commit" || { echo 'New release health check failed.' >&2; exit 1; }
echo "Deployment successful: $release"
# Keep the current and previous release, plus up to five recent release directories.
mapfile -t known < <(find "$releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -nr | cut -d' ' -f2-)
for ((i=5; i<${#known[@]}; i++)); do
  candidate=${known[$i]}
  name=${candidate##*/}
  if [[ $candidate == "$releases/$name" && $name =~ ^[0-9a-f]{40}(-[0-9]+-[0-9]+)?$ && $candidate != "$old" && $candidate != "$release" && ! -L $candidate ]]; then
    echo "Removing old Become release: $candidate"
    rm -rf --one-file-system -- "$candidate" || echo "Could not remove $candidate" >&2
  fi
done
