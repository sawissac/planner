-- Schema the Realtime server keeps its own tables in (DB_AFTER_CONNECT_QUERY
-- in docker-compose.yml). Runs only when the db volume is first created; on
-- an existing volume, run it once by hand (see docker-compose.yml).
create schema if not exists _realtime;
alter schema _realtime owner to supabase_admin;
