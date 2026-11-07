-- Android push delivery: notification insert queue and private internal authentication.
begin;
create extension if not exists pg_net;
create table if not exists private.push_delivery_config (
  id smallint primary key check (id = 1),
  internal_secret text not null
);
revoke all on private.push_delivery_config from public, anon, authenticated;
insert into private.push_delivery_config(id, internal_secret)
values (1, encode(gen_random_bytes(32), 'hex'))
on conflict (id) do nothing;
create or replace function public.get_push_delivery_secret()
returns text language sql stable security definer set search_path=''
as $$ select internal_secret from private.push_delivery_config where id=1; $$;
revoke all on function public.get_push_delivery_secret() from public, anon, authenticated;
grant execute on function public.get_push_delivery_secret() to service_role;
create or replace function private.enqueue_android_push()
returns trigger language plpgsql security definer set search_path=''
as $$
declare shared_secret text;
begin
 select internal_secret into shared_secret from private.push_delivery_config where id=1;
 if shared_secret is not null then
  perform net.http_post(
   url := 'https://chohswyxsckpwyzlbzav.supabase.co/functions/v1/send-push',
   body := jsonb_build_object('notification_id',new.id,'user_id',new.user_id),
   headers := jsonb_build_object('Content-Type','application/json','x-push-secret',shared_secret),
   timeout_milliseconds := 5000
  );
 end if;
 return new;
end;
$$;
revoke all on function private.enqueue_android_push() from public, anon, authenticated;
drop trigger if exists enqueue_android_push_for_notifications on public.notifications;
create trigger enqueue_android_push_for_notifications after insert on public.notifications
for each row execute function private.enqueue_android_push();
commit;
