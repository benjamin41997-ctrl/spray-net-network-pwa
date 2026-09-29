-- Replace replace-with-your-login@example.com with the owner login before running.
-- Run once in this project's SQL Editor. No private credentials belong in GitHub.
begin;
create schema if not exists network_private;
revoke all on schema network_private from public, anon, authenticated;
create table if not exists network_private.approved_emails (
 email text primary key check(email=lower(email)), name text not null
);
insert into network_private.approved_emails(email,name) values ('replace-with-your-login@example.com','Project Owner') on conflict do nothing;
create table if not exists public.network_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 name text not null, active boolean not null default true
);
alter table public.network_members enable row level security;
drop policy if exists member_self on public.network_members;
create policy member_self on public.network_members for select to authenticated using(user_id=auth.uid());
revoke all on public.network_members from anon, authenticated;
grant select on public.network_members to authenticated;

-- Only a verified, pre-approved email is enrolled. Signup alone grants no data access.
create or replace function network_private.enroll_member() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.email_confirmed_at is not null then
  insert into public.network_members(user_id,name)
   select new.id,a.name from network_private.approved_emails a where a.email=lower(new.email)
   on conflict(user_id) do nothing;
 end if;
 return new;
end $$;
revoke all on function network_private.enroll_member() from public,anon,authenticated;
drop trigger if exists network_enroll on auth.users;
create trigger network_enroll after insert or update of email_confirmed_at on auth.users for each row execute function network_private.enroll_member();
insert into public.network_members(user_id,name)
 select u.id,a.name from auth.users u join network_private.approved_emails a on a.email=lower(u.email)
 where u.email_confirmed_at is not null on conflict do nothing;

create table if not exists public.network_records (
 kind text not null check(kind in ('social','activity','suggestion','mailing')),
 record_key text not null check(length(record_key) between 1 and 1200),
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=16000000),
 revision bigint not null check(revision>0), updated_at timestamptz not null default now(),
 updated_by uuid not null references auth.users(id), primary key(kind,record_key)
);
alter table public.network_records enable row level security;
drop policy if exists member_records on public.network_records;
create policy member_records on public.network_records for all to authenticated
 using(exists(select 1 from public.network_members where user_id=auth.uid() and active))
 with check(exists(select 1 from public.network_members where user_id=auth.uid() and active));
revoke all on public.network_records from anon, authenticated;
grant select,insert,update on public.network_records to authenticated;

create table if not exists public.network_mutations (
 id uuid primary key, actor uuid not null references auth.users(id), changes jsonb not null, created_at timestamptz not null default now()
);
alter table public.network_mutations enable row level security;
drop policy if exists own_mutations on public.network_mutations;
create policy own_mutations on public.network_mutations for all to authenticated
 using(actor=auth.uid() and exists(select 1 from public.network_members where user_id=auth.uid() and active))
 with check(actor=auth.uid() and exists(select 1 from public.network_members where user_id=auth.uid() and active));
revoke all on public.network_mutations from anon,authenticated;
grant select,insert on public.network_mutations to authenticated;

create table if not exists network_private.audit (
 id bigint generated always as identity primary key, kind text not null, record_key text not null,
 revision bigint not null, actor uuid not null, changed_at timestamptz not null, payload jsonb not null
);
create or replace function network_private.stamp_record() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if tg_op='INSERT' and new.revision<>1 or tg_op='UPDATE' and (new.revision<>old.revision+1 or new.kind<>old.kind or new.record_key<>old.record_key) then
  raise exception 'Invalid revision';
 end if;
 new.updated_by=auth.uid();new.updated_at=clock_timestamp();
 insert into network_private.audit(kind,record_key,revision,actor,changed_at,payload)
 values(new.kind,new.record_key,new.revision,new.updated_by,new.updated_at,new.payload);
 return new;
end $$;
revoke all on function network_private.stamp_record() from public,anon,authenticated;
drop trigger if exists network_stamp on public.network_records;
create trigger network_stamp before insert or update on public.network_records for each row execute function network_private.stamp_record();

create or replace function public.network_pull() returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.network_members where user_id=auth.uid() and active) then raise exception 'Team access not approved' using errcode='42501';end if;
 return jsonb_build_object('member',(select name from public.network_members where user_id=auth.uid()),'records',coalesce((select jsonb_agg(to_jsonb(r)) from public.network_records r),'[]'::jsonb));
end $$;

create or replace function public.network_commit(p_mutation uuid,p_changes jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare item jsonb; old_revision bigint; prior jsonb; result jsonb;
begin
 if not exists(select 1 from public.network_members where user_id=auth.uid() and active) then raise exception 'Team access not approved' using errcode='42501';end if;
 if jsonb_typeof(p_changes)<>'array' or jsonb_array_length(p_changes) not between 1 and 50000 then raise exception 'Invalid change batch';end if;
 -- Serialize batches; conflict checking and all records commit in one transaction.
 perform pg_catalog.pg_advisory_xact_lock(921760);
 select changes into prior from public.network_mutations where id=p_mutation;
 if found then
  if prior<>p_changes then raise exception 'Mutation ID reused';end if;
  return public.network_pull();
 end if;
 if (select count(*)<>count(distinct (v->>'kind',v->>'key')) from jsonb_array_elements(p_changes) v) then raise exception 'Duplicate change keys';end if;
 for item in select value from jsonb_array_elements(p_changes) loop
  if item->>'kind' is null or item->>'key' is null or item->>'expected' is null then raise exception 'Invalid change';end if;
  select revision into old_revision from public.network_records where kind=item->>'kind' and record_key=item->>'key' for update;
  if coalesce(old_revision,0)<>(item->>'expected')::bigint then raise exception 'SYNC_CONFLICT: % %',item->>'kind',item->>'key' using errcode='40001';end if;
  insert into public.network_records(kind,record_key,payload,revision,updated_by)
   values(item->>'kind',item->>'key',item->'payload',coalesce(old_revision,0)+1,auth.uid())
   on conflict(kind,record_key) do update set payload=excluded.payload,revision=excluded.revision;
 end loop;
 insert into public.network_mutations(id,actor,changes) values(p_mutation,auth.uid(),p_changes);
 result=public.network_pull();return result;
end $$;
revoke all on function public.network_pull() from public,anon;
revoke all on function public.network_commit(uuid,jsonb) from public,anon;
grant execute on function public.network_pull() to authenticated;
grant execute on function public.network_commit(uuid,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
