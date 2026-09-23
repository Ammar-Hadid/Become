#!/bin/bash
# Forced command for one dedicated SSH public key on the existing ammar account.
set -Eeuo pipefail
umask 077
[[ ${SSH_ORIGINAL_COMMAND:-} =~ ^deploy\ ([0-9a-f]{40})\ ([0-9]+-[0-9]+)$ ]] || {
  echo 'Invalid Become deployment request.' >&2
  exit 1
}
commit=${BASH_REMATCH[1]}
run=${BASH_REMATCH[2]}
incoming=$(mktemp /home/ammar/.become-deploy.XXXXXXXX.tar)
trap 'rm -f -- "$incoming"' EXIT
# Bound the uploaded archive before passing it to the privileged installer.
head -c 104857601 > "$incoming"
[[ $(stat -c %s "$incoming") -le 104857600 ]] || {
  echo 'Become archive exceeds 100 MiB.' >&2
  exit 1
}
sudo -n /usr/local/sbin/become-deploy "$commit" "$run" "$incoming"
