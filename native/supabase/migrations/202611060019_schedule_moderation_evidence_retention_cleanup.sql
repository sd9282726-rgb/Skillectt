-- Enable scheduled cleanup for moderator-only evidence snapshots.
-- moderation_evidence.retention_until defaults to 180 days after capture.
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'skillect-moderation-evidence-retention',
  '15 2 * * *',
  $$delete from public.moderation_evidence where retention_until < now()$$
);
