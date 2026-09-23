#!/bin/bash
# One-time, reviewed root setup on the existing Become VPS.
# Usage: install-auto-deploy.sh /path/to/dedicated-deploy-key.pub
set -Eeuo pipefail
umask 077
[[ $EUID -eq 0 ]] || { echo 'Run as root.' >&2; exit 1; }
pubkey=${1:-}
[[ -f $pubkey && ! -L $pubkey ]] || { echo 'Provide a regular ed25519 public key file.' >&2; exit 1; }
key=$(cat "$pubkey")
[[ $key =~ ^ssh-ed25519\ [A-Za-z0-9+/=]+(\ .*)?$ && $key != *$'\n'* ]] || {
  echo 'Only one ed25519 public key is accepted.' >&2; exit 1;
}
ssh-keygen -lf "$pubkey" >/dev/null
source_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
[[ -f $source_dir/become-deploy.sh && -f $source_dir/become-backup.sh ]] || {
  echo 'Run the installer from a checked-out Become release.' >&2; exit 1;
}
[[ -d /srv/apps/become/releases && -L /srv/apps/become/current && -d /srv/data/become/media ]] || {
  echo 'Expected existing Become release and media paths are missing.' >&2; exit 1;
}
[[ $(systemctl show -p User --value become.service) == become ]] || {
  echo 'become.service does not run as become.' >&2; exit 1;
}
[[ $(id -un 1000) == ammar ]] || { echo 'Expected SSH user ammar is missing.' >&2; exit 1; }
for target in /usr/local/sbin/become-deploy /usr/local/sbin/become-backup /usr/local/sbin/become-deploy-ssh /usr/local/sbin/become-rollback; do
  [[ ! -L $target ]] || { echo "Refusing symlinked target: $target" >&2; exit 1; }
done
install -d -o root -g become -m 0750 /srv/apps/become/incoming
install -o root -g root -m 0750 "$source_dir/become-deploy.sh" /usr/local/sbin/become-deploy
install -o root -g root -m 0750 "$source_dir/become-backup.sh" /usr/local/sbin/become-backup
install -o root -g root -m 0755 "$source_dir/become-deploy-ssh.sh" /usr/local/sbin/become-deploy-ssh
install -o root -g root -m 0750 "$source_dir/become-rollback.sh" /usr/local/sbin/become-rollback

# The dedicated key can invoke only the upload/deploy wrapper. Existing keys remain intact.
install -d -o ammar -g ammar -m 0700 /home/ammar/.ssh
authorized=/home/ammar/.ssh/authorized_keys
[[ ! -L $authorized ]] || { echo 'Refusing symlinked authorized_keys.' >&2; exit 1; }
touch "$authorized"
chown ammar:ammar "$authorized"
chmod 0600 "$authorized"
entry="restrict,command=\"/usr/local/sbin/become-deploy-ssh\" $key"
grep -Fxq -- "$entry" "$authorized" || printf '%s\n' "$entry" >> "$authorized"

sudoers=/etc/sudoers.d/become-deploy
tmp=$(mktemp /etc/sudoers.d/.become-deploy.XXXXXX)
trap 'rm -f -- "$tmp"' EXIT
printf 'ammar ALL=(root) NOPASSWD: /usr/local/sbin/become-deploy *\n' > "$tmp"
chmod 0440 "$tmp"
visudo -cf "$tmp"
install -o root -g root -m 0440 "$tmp" "$sudoers"

# Install only Become backup units. Existing timer state is left as-is.
install -o root -g root -m 0644 "$source_dir/become-backup.service" /etc/systemd/system/become-backup.service
install -o root -g root -m 0644 "$source_dir/become-backup.timer" /etc/systemd/system/become-backup.timer
systemctl daemon-reload
systemd-analyze verify /etc/systemd/system/become-backup.service /etc/systemd/system/become-backup.timer
echo 'Become deployment entry point and backup units installed. Configure offsite backup before deploying.'
