#!/usr/bin/env python3
"""Create fresh Become database credentials without changing the active app URL."""
import os
from pathlib import Path
import secrets

if os.geteuid() != 0:
    raise SystemExit("Run as root on the Become VPS.")

root = Path("/etc/become")
targets = [root / name for name in ("postgres.env", "postgres-runtime.env", "postgres-maintenance.env")]
if not root.is_dir() or any(path.exists() or path.is_symlink() for path in targets):
    raise SystemExit("Expected existing /etc/become and no previously prepared database credentials.")

admin, owner, app = (secrets.token_hex(32) for _ in range(3))
endpoint = "127.0.0.1:15433/become?sslmode=disable"
contents = [
    f"POSTGRES_PASSWORD='{admin}'\nBECOME_OWNER_PASSWORD='{owner}'\nBECOME_APP_PASSWORD='{app}'\n",
    f"DATABASE_URL='postgresql://become_app:{app}@{endpoint}'\n",
    f"DIRECT_DATABASE_URL='postgresql://become_owner:{owner}@{endpoint}'\n",
]
os.umask(0o077)
for path, content in zip(targets, contents):
    with path.open("x") as file:
        file.write(content)
print("Prepared root-only credentials; active application configuration is unchanged.")
