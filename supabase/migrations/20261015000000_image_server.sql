-- Image server settings.
--
-- Images moved out of the Next app into their own Bun server (images/, on
-- http://localhost:3033 by default). Each user points Planner at it in
-- Settings → API keys → Image server: its URL plus its own token (pim_…),
-- kept as a planner_agent_servers row with provider 'images'
-- (src/lib/image-server.ts). The app loads every embedded image from that
-- server with the token; the planner_images rows and files are unchanged.

alter table public.planner_agent_servers
  drop constraint planner_agent_servers_provider_check;

alter table public.planner_agent_servers
  add constraint planner_agent_servers_provider_check
  check (provider in ('claude-code', 'images'));
