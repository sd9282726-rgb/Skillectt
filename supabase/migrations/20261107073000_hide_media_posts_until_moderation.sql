-- Allow a media post to be created only when its media has a pending
-- moderation record and the post is hidden. The post becomes visible only
-- after automated or moderator approval.
create or replace function private.require_approved_post_media()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.image_url is not null
     and (tg_op = 'INSERT' or new.image_url is distinct from old.image_url)
     and not exists (
       select 1
       from public.media_assets a
       where a.owner_id = new.author_id
         and a.public_url = new.image_url
         and (
           a.status = 'approved'
           or (a.status = 'pending' and new.moderation_hidden = true)
         )
     ) then
    raise exception 'Media must have a pending safety record and remain hidden until approval.'
      using errcode = '42501';
  end if;
  return new;
end;
$function$;
