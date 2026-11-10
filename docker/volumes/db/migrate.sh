#!/bin/sh
# Applies ../supabase/migrations/*.sql in filename order, skipping versions
# already recorded in supabase_migrations.schema_migrations (same table the
# Supabase CLI uses). Each file runs in one transaction with its bookkeeping row.
set -eu

psql -v ON_ERROR_STOP=1 -q <<'SQL'
set client_min_messages = warning;
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key,
  statements text[],
  name text
);
SQL

for f in /migrations/*.sql; do
  [ -e "$f" ] || continue
  file=$(basename "$f" .sql)
  version=${file%%_*}
  name=${file#*_}

  applied=$(psql -tAc "select 1 from supabase_migrations.schema_migrations where version = '$version'")
  if [ "$applied" = "1" ]; then
    continue
  fi

  echo "Applying $file"
  psql -v ON_ERROR_STOP=1 -q -1 \
    -f "$f" \
    -c "insert into supabase_migrations.schema_migrations (version, name) values ('$version', '$name')"
done

# Make PostgREST pick up new tables/functions
psql -qc "notify pgrst, 'reload schema'"
echo "Migrations up to date"
