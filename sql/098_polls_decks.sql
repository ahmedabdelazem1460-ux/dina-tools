-- 098: السؤال اللحظي (مثل ClassPoint) والعروض التقديمية — جداول جديدة فقط.
create table if not exists public.live_polls (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  host uuid not null default public.me() references public.staff(id) on delete cascade,
  code text not null unique, q_no int not null default 1,
  kind text not null default 'mcq' check (kind in ('mcq','tf','cloud','short','scale','number')),
  question text not null default '', options jsonb not null default '[]'::jsonb, correct text,
  state text not null default 'open' check (state in ('open','closed','ended')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.live_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.live_polls(id) on delete cascade,
  q_no int not null, device text not null, name text not null default '', answer text not null default '',
  created_at timestamptz not null default now(),
  unique (poll_id, q_no, device)
);
alter table public.live_polls enable row level security;
alter table public.live_votes enable row level security;
create policy lp_host on public.live_polls for all using (school_id = public.my_school() and (host = public.me() or public.is_owner())) with check (school_id = public.my_school() and host = public.me());
create policy lv_host on public.live_votes for select using (exists (select 1 from public.live_polls p where p.id = poll_id and p.school_id = public.my_school() and (p.host = public.me() or public.is_owner())));
grant select, insert, update, delete on public.live_polls to authenticated;
grant select on public.live_votes to authenticated;

-- للطالب بلا حساب: قراءة السؤال الحالي برمزه، والتصويت (مرة لكل سؤال لكل جهاز، ويمكن التعديل ما دام مفتوحاً)
create or replace function public.poll_get(p_code text) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', p.id, 'q_no', p.q_no, 'kind', p.kind, 'question', p.question, 'options', p.options, 'state', p.state,
    'correct', case when p.state = 'closed' then p.correct end, 'school', (select name from public.schools where id = p.school_id))
  from public.live_polls p where p.code = upper(trim(p_code)) and p.state <> 'ended' and p.updated_at > now() - interval '12 hours'
$$;
create or replace function public.poll_vote(p_code text, p_device text, p_name text, p_answer text) returns boolean
language plpgsql security definer set search_path = public as $$
declare p public.live_polls;
begin
  select * into p from public.live_polls where code = upper(trim(p_code)) and state = 'open';
  if not found then raise exception 'السؤال مغلق أو انتهى'; end if;
  if coalesce(length(trim(p_device)), 0) < 6 or length(p_answer) > 300 then raise exception 'إجابة غير صالحة'; end if;
  insert into public.live_votes (poll_id, q_no, device, name, answer) values (p.id, p.q_no, left(p_device, 64), left(coalesce(p_name, ''), 40), trim(p_answer))
  on conflict (poll_id, q_no, device) do update set answer = excluded.answer, name = excluded.name, created_at = now();
  return true;
end $$;
grant execute on function public.poll_get(text), public.poll_vote(text, text, text, text) to anon, authenticated;
alter publication supabase_realtime add table public.live_votes;

-- العروض التقديمية
create table if not exists public.decks (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  owner uuid not null default public.me() references public.staff(id) on delete cascade,
  title text not null default '', theme text not null default 'navy', slides jsonb not null default '[]'::jsonb,
  shared boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.decks enable row level security;
create policy dk_read on public.decks for select using (school_id = public.my_school() and (owner = public.me() or shared or public.is_owner()));
create policy dk_ins on public.decks for insert with check (school_id = public.my_school() and owner = public.me());
create policy dk_upd on public.decks for update using (school_id = public.my_school() and owner = public.me()) with check (owner = public.me());
create policy dk_del on public.decks for delete using (school_id = public.my_school() and (owner = public.me() or public.is_owner()));
grant select, insert, update, delete on public.decks to authenticated;
