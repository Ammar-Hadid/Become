# Become automatic production deployment

The existing `/srv/apps/become/current` symlink, `become.service`, dedicated Node runtime, Neon roles, media root, and Become Caddy site remain in place. No other VPS application or proxy site is changed. The setup below is a one-time administrator task; subsequent pushes to `main` deploy automatically.

## One-time setup

1. On the VPS, verify `/srv/apps/become/current` points to a built release with `RELEASE_COMMIT`, `/srv/data/become/media` is the private persistent media root, and `become.service` is the only process being restarted. Verify `/etc/become/production.env` and `/etc/become/maintenance.env` exist. Make and verify a local PostgreSQL/media backup before enabling unattended deployment. The archive checks confirm file integrity, but a database restore rehearsal in an isolated environment is still needed to prove recovery. The [offsite Restic setup](PRODUCTION.md#10-back-up-the-database-and-media-together) can be added later by creating `/etc/become/backup.env` with both Restic settings; keep those credentials off GitHub.
2. Generate a **dedicated** Ed25519 deployment key on a trusted machine. Transfer only its public key and the reviewed `ops/production/` directory to the VPS. As root, run `bash ops/production/install-auto-deploy.sh /path/to/deploy-key.pub`. The installer verifies the existing Become service/layout, installs only Become scripts and backup units, appends one forced-command key for `ammar`, and adds a narrow sudo rule for the deployment script. It does not enable the backup timer or modify Caddy. Review the resulting `/etc/sudoers.d/become-deploy` and `authorized_keys` entry. The key cannot request a shell or forward ports.
3. In the GitHub repository, create a `production` Environment. Set Environment variables `BECOME_DEPLOY_HOST` (the VPS host/IP used by the key) and `BECOME_DEPLOY_USER=ammar`. Set Environment secrets `BECOME_DEPLOY_SSH_KEY` (the dedicated private key) and `BECOME_DEPLOY_KNOWN_HOSTS` (the VPS SSH host key line, independently fingerprint-verified). Keep the environment limited to `main`. Do not put database, media, or Restic credentials in Actions. A direct push to `main` runs validation before deployment; if you later choose PR-only changes, require the `validate` status check in branch protection.
4. Confirm the installed `/usr/local/sbin/become-backup` contains the deployment lock handoff, and run a Become backup manually: `sudo /usr/local/sbin/become-backup`. Verify the local set, including its checksums and archive contents. If Restic is configured, verify the offsite snapshot too. Enable the existing nightly timer only after that succeeds: `sudo systemctl enable --now become-backup.timer`.

The private SSH key is a production credential. Keep it out of the repository, issue it only for this workflow, and rotate/revoke it if exposed. GitHub Actions permissions are repository read only; only the deployment job enters the `production` Environment.

Example transfer from the reviewed branch on your Mac (replace the public-key path with your own):

```bash
tar -czf /tmp/become-auto-deploy-ops.tgz -C . ops/production
scp /tmp/become-auto-deploy-ops.tgz nexo-vps:/home/ammar/
scp /path/to/deploy-key.pub nexo-vps:/home/ammar/deploy-key.pub
ssh nexo-vps
```

Then, in that VPS shell:

```bash
mkdir -p /home/ammar/become-auto-deploy-setup
tar -xzf /home/ammar/become-auto-deploy-ops.tgz -C /home/ammar/become-auto-deploy-setup
sudo bash /home/ammar/become-auto-deploy-setup/ops/production/install-auto-deploy.sh /home/ammar/deploy-key.pub
```

Check the tar archive contents and the installer's paths before running it. The installer does not create or populate backup credentials.

## Push flow

On a pull request, Actions installs from `pnpm-lock.yaml`, generates Prisma, lints, typechecks, tests, and builds. On a push to `main`, the same gate must pass before the deploy job runs. The deploy job archives **that exact commit** and streams it over the restricted SSH key. GitHub serializes deployment jobs and never cancels one already in progress; `/run/lock/become-maintenance.lock` serializes server maintenance with the existing backup script.

The server verifies the archive's embedded commit, creates `/srv/apps/become/releases/<full-sha>-<run>-<attempt>/`, writes `RELEASE_COMMIT` and `RELEASE_INFO`, installs and builds there as `become`, and checks pending migration SQL for obvious destructive statements. If a pending migration contains `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, or `DELETE FROM`, deployment stops for manual review. This is a conservative text check, **not** a SQL parser or proof of compatibility; review migrations before merging. Schema changes should be backward compatible with the previous release.

After the inactive build succeeds, the deployment runs the coordinated PostgreSQL/media backup. It checks the database connection before stopping Become. The local set must complete; when Restic is configured, its encrypted offsite copy must also complete. A backup failure stops deployment. The script then stops only `become.service`, applies committed migrations with `prisma migrate deploy`, synchronizes built-in reference data, atomically switches `current`, starts Become, and retries `/api/health` for up to roughly a minute. That endpoint tests a database query and returns the serving commit without secrets. A healthy new release completes deployment. Successful deployment keeps the current and previous release plus up to five recent release directories; no backup history is deleted.

If building or backup fails, the old release remains active. If migration fails or its outcome is uncertain, Become remains stopped for investigation; automatically restarting old code against a possibly partial schema would be unsafe. If startup or health fails after successful migrations, the script restores the previous application symlink, restarts only Become, and checks its health. For a release from before `/api/health` existed, recovery checks the sign-in page and service state. It never reverses a database migration. A failed rollback or failed recovery health is explicit in Actions logs.

## Operations

- Current version: `readlink -f /srv/apps/become/current` and `cat /srv/apps/become/current/RELEASE_INFO`. Public `GET /api/health` returns the serving commit and `ok` status when the database is reachable.
- Logs: GitHub Actions run; `sudo journalctl -u become.service -u become-backup.service --since today`; local sets in `/srv/backups/become/`. Do not paste environment files into logs.
- Manual rollback: first verify target compatibility with the **current** schema/media, then on the VPS run `sudo /usr/local/sbin/become-rollback /srv/apps/become/releases/<known-good-release>`. It holds the same maintenance lock, switches only Become, and checks health. It does not restore the database.
- Emergency manual deployment: run the same validation commands and choose a reviewed full commit. Archive it with `git archive --format=tar <sha>`, then upload that tar file as `ammar` to `/home/ammar/.become-deploy.manual<digits>.tar`. From your existing `ssh nexo-vps` session, run `sudo /usr/local/sbin/become-deploy <sha> 0-<same-digits> /home/ammar/.become-deploy.manual<digits>.tar`. The server still builds, backs up, migrates, and health-checks. Remove that exact uploaded tar after the result is understood. No local copy of the GitHub private deploy key is needed for this path.
- Before a planned destructive migration, rehearse it against a restored production backup or isolated Neon branch and choose a compatible release/rollback plan. Apply it under a maintenance window following [the production recovery guide](PRODUCTION.md#14-rollback-recovery-and-restore-rehearsal); do not bypass the migration guard blindly.

The initial administrator setup and GitHub Environment cannot be completed by a repository commit alone. The deployment workflow is deliberately fail-closed until the server scripts, verified local backup, forced SSH key, pinned host key, and Environment values are installed. Local-only sets do not survive loss of the VPS; adding Restic later requires no deployment workflow change.
