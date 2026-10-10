-- Remove "Run agent" and the Projects sidebar.
--
-- The execute-cli bridge, its settings (planner_agent_servers) and the saved
-- project folders (project_paths) are gone from the app. The tables are
-- dropped here rather than by deleting their migrations, which may already be
-- applied to the linked project. Rows go with them: server URLs/tokens and
-- folder paths.

drop table if exists public.planner_agent_servers;
drop table if exists public.project_paths;
