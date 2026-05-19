alter table messages add column if not exists wamid text unique;

alter publication supabase_realtime add table messages;
