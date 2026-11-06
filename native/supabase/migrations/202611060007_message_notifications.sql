-- Create generic in-app notifications for messages without exposing message text.
create or replace function private.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare participant uuid;
begin
  for participant in
    select cp.user_id
    from public.conversation_participants cp
    where cp.conversation_id = new.conversation_id
      and cp.user_id <> new.sender_id
  loop
    insert into public.notifications(user_id,actor_id,type,entity_type,entity_id,message)
    values(participant,new.sender_id,'new_message','conversation',new.conversation_id,'sent you a message');
  end loop;
  return new;
end;
$$;
revoke all on function private.notify_new_message() from public,anon,authenticated;
drop trigger if exists notifications_on_new_message on public.messages;
create trigger notifications_on_new_message after insert on public.messages
for each row execute function private.notify_new_message();
