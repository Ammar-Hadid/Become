#!/bin/bash
# Manual root-only application rollback. Database/media are deliberately untouched.
set -Eeuo pipefail
[[ $EUID -eq 0 ]] || { echo 'Run as root.' >&2; exit 1; }
target=${1:-}
base=/srv/apps/become
releases=$base/releases
[[ $target =~ ^/srv/apps/become/releases/[0-9a-f]{40}(-[0-9]+-[0-9]+)?$ ]] || {
  echo 'Specify an absolute Become release path.' >&2; exit 1;
}
[[ -d $target && ! -L $target && -s $target/RELEASE_COMMIT && -s $target/.next/BUILD_ID ]] || {
  echo 'Target is not a prepared release.' >&2; exit 1;
}
[[ -L $base/current && ! -e $base/current.next && ! -L $base/current.next ]] || {
  echo 'Current link is missing or a switch is already staged.' >&2; exit 1;
}
exec 9>/run/lock/become-maintenance.lock
flock -n 9 || { echo 'Another Become maintenance operation is running.' >&2; exit 1; }
previous=$(readlink -f "$base/current")
[[ $previous == "$releases/"* ]] || { echo 'Unexpected current target.' >&2; exit 1; }
[[ $previous != "$target" ]] || { echo 'Target is already current.'; exit 0; }
echo 'Confirm this release is compatible with the current database schema and media format.'
echo "Current: $previous"
echo "Target: $target"
on_exit() {
  local result=$?
  trap - EXIT
  if (( result != 0 )); then
    echo 'Rollback command failed; restoring its starting release.' >&2
    if [[ -L $base/current.next && $(readlink "$base/current.next") == "$target" ]]; then
      rm -f -- "$base/current.next"
    fi
    if [[ $(readlink -f "$base/current" 2>/dev/null || true) != "$previous" ]]; then
      ln -s "$previous" "$base/current.recover.$$" && mv -Tf "$base/current.recover.$$" "$base/current" || {
        echo 'RECOVERY FAILED: inspect the Become current symlink immediately.' >&2
        exit 1
      }
    fi
    systemctl reset-failed become.service || true
    systemctl start become.service || echo 'RECOVERY FAILED: Become did not start.' >&2
  fi
  exit "$result"
}
trap on_exit EXIT
systemctl stop become.service
ln -s "$target" "$base/current.next"
mv -Tf "$base/current.next" "$base/current"
systemctl reset-failed become.service || true
systemctl start become.service
expected=$(cat "$target/RELEASE_COMMIT")
for ((attempt=1; attempt<=30; attempt++)); do
  if [[ -f $target/src/app/api/health/route.ts ]]; then
    body=$(curl -fsS --max-time 4 http://172.23.0.1:3010/api/health 2>/dev/null || true)
    healthy=$([[ $body == *'"status":"ok"'* && $body == *"\"commit\":\"$expected\""* ]] && echo yes || true)
  else
    healthy=$([[ $(curl -sS -o /dev/null -w '%{http_code}' --max-time 4 http://172.23.0.1:3010/sign-in 2>/dev/null || true) == 200 ]] && echo yes || true)
  fi
  if [[ $healthy == yes && $(systemctl is-active become.service) == active ]]; then
    echo "Rollback healthy: $target"
    exit 0
  fi
  sleep 2
done
echo 'Rollback health check failed. Inspect journalctl -u become.service and the current schema.' >&2
exit 1
