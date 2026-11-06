-- Allow signed-in users to upload only their own video objects into private quarantine.
drop policy if exists "Users can upload own quarantined videos" on storage.objects;
create policy "Users can upload own quarantined videos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'media-quarantine'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and storage.extension(name) in ('mp4','webm','mov')
);
