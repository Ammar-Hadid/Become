#!/bin/bash
# Source as root to turn the private direct database URL into libpq settings.
# libpq does not expand a URI supplied through PGDATABASE for every client.
become_set_pg_connection() {
  local url=${1:?Direct database URL is required} value
  local -a values
  values=()
  while IFS= read -r -d '' value; do
    values+=("$value")
  done < <(DIRECT_DATABASE_URL="$url" python3 - <<'PY'
import os
import sys
from urllib.parse import parse_qs, unquote, urlsplit

try:
    url = urlsplit(os.environ["DIRECT_DATABASE_URL"])
    if url.scheme not in ("postgres", "postgresql"):
        raise ValueError("unsupported database URL scheme")
    host = url.hostname
    direct_url = url.geturl()
    port = str(url.port or 5432)
    user = unquote(url.username or "")
    password = unquote(url.password or "")
    database = unquote(url.path[1:]) if url.path.startswith("/") else ""
    if not all((host, user, password, database)):
        raise ValueError("database URL needs host, user, password, and database")
    query = parse_qs(url.query, keep_blank_values=True)
    sslmode = query.get("sslmode", [""])[-1]
    sslrootcert = query.get("sslrootcert", [""])[-1]
    if sslmode in ("verify-ca", "verify-full") and not sslrootcert:
        sslmode = "verify-full"
        sslrootcert = "system"
    options = (
        host, port, user, password, database,
        sslmode,
        query.get("channel_binding", [""])[-1],
        sslrootcert,
        query.get("options", [""])[-1],
        query.get("target_session_attrs", [""])[-1],
        direct_url,
    )
    if any("\n" in value or "\r" in value or "\0" in value for value in options):
        raise ValueError("database URL contains an invalid control character")
    sys.stdout.buffer.write("\0".join(options).encode() + b"\0")
except (ValueError, KeyError) as exc:
    print(f"Invalid direct database URL: {exc}", file=sys.stderr)
    sys.exit(1)
PY
  )
  [[ ${#values[@]} -eq 11 ]] || {
    echo 'Could not parse the direct database URL for PostgreSQL clients.' >&2
    return 1
  }
  export PGHOST=${values[0]} PGPORT=${values[1]} PGUSER=${values[2]}
  export PGPASSWORD=${values[3]} PGDATABASE=${values[4]}
  export DIRECT_DATABASE_URL=${values[10]}
  local index name
  local -a optional=(PGSSLMODE PGCHANNELBINDING PGSSLROOTCERT PGOPTIONS PGTARGETSESSIONATTRS)
  for index in "${!optional[@]}"; do
    name=${optional[$index]}
    if [[ -n ${values[$((index+5))]} ]]; then
      printf -v "$name" '%s' "${values[$((index+5))]}"
      export "$name"
    else
      unset "$name"
    fi
  done
}
