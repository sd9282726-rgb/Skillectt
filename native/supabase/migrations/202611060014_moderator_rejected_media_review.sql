-- Allow moderator review of rejected/quarantined media records.
grant update on public.media_assets to authenticated;
drop policy if exists "Moderators review rejected media" on public.media_assets;
create policy "Moderators review rejected media"
on public.media_assets for update to authenticated
using (private.is_moderator())
with check (private.is_moderator());
