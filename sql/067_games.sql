-- 067: الألعاب التعليمية — مسابقة مباشرة برمز (games/game_players/game_answers) + ألعاب ذاتية من مجموعات أسئلة (game_sets)
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(), school_id uuid not null, host uuid not null default public.me(),
  pin text not null unique, title text not null default '', questions jsonb not null default '[]',
  state text not null default 'lobby' check (state in ('lobby','question','reveal','end')), qi int not null default -1,
  q_started_at timestamptz, settings jsonb not null default '{}', created_at timestamptz not null default now());
create table if not exists public.game_players (
  id uuid primary key default gen_random_uuid(), game_id uuid not null references public.games(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(12),'hex'), nick text not null, score int not null default 0, streak int not null default 0,
  joined_at timestamptz not null default now(), unique (game_id, nick));
create table if not exists public.game_answers (
  game_id uuid not null references public.games(id) on delete cascade, player_id uuid not null references public.game_players(id) on delete cascade,
  qi int not null, choice text not null, ok boolean not null default false, pts int not null default 0, ms int, at timestamptz not null default now(),
  primary key (player_id, qi));
create table if not exists public.game_sets (
  id uuid primary key default gen_random_uuid(), school_id uuid not null, created_by uuid default public.me(), code text not null unique,
  title text not null default '', subject_id uuid, grade_key text, question_ids uuid[] not null default '{}', modes text[] not null default '{flash,match,quiz,tf,wheel}',
  active boolean not null default true, plays int not null default 0, created_at timestamptz not null default now());
alter table public.games enable row level security; alter table public.game_players enable row level security; alter table public.game_answers enable row level security; alter table public.game_sets enable row level security;
drop policy if exists g_host on public.games; create policy g_host on public.games for all using (school_id = public.my_school() and (host = public.me() or public.is_owner())) with check (school_id = public.my_school() and (host = public.me() or public.is_owner()));
drop policy if exists gp_host on public.game_players; create policy gp_host on public.game_players for all using (exists (select 1 from public.games g where g.id = game_id and g.school_id = public.my_school() and (g.host = public.me() or public.is_owner())));
drop policy if exists ga_host on public.game_answers; create policy ga_host on public.game_answers for select using (exists (select 1 from public.games g where g.id = game_id and g.school_id = public.my_school() and (g.host = public.me() or public.is_owner())));
drop policy if exists gs_rw on public.game_sets; create policy gs_rw on public.game_sets for all using (school_id = public.my_school() and (created_by = public.me() or public.is_owner())) with check (school_id = public.my_school());

-- اللاعب (دون حساب): الانضمام برمز اللعبة
create or replace function public.game_join(p_pin text, p_nick text) returns jsonb language plpgsql security definer set search_path = public as $$
declare g record; p record; nk text := left(btrim(regexp_replace(coalesce(p_nick,''), '\s+', ' ', 'g')), 24);
begin
  select * into g from public.games where pin = btrim(p_pin);
  if g.id is null or g.state = 'end' then raise exception 'BAD_PIN'; end if;
  if length(nk) < 2 then raise exception 'BAD_NICK'; end if;
  if exists (select 1 from public.game_players where game_id = g.id and lower(nick) = lower(nk)) then raise exception 'NICK_TAKEN'; end if;
  if (select count(*) from public.game_players where game_id = g.id) >= 200 then raise exception 'FULL'; end if;
  insert into public.game_players(game_id, nick) values (g.id, nk) returning * into p;
  return jsonb_build_object('token', p.token, 'nick', p.nick, 'title', g.title);
end $$;

-- حالة اللعبة للاعب (دون الإجابة الصحيحة إلا بعد الكشف)
create or replace function public.game_state(p_token text) returns jsonb language plpgsql security definer set search_path = public as $$
declare p record; g record; q jsonb; a record; rank int; n int;
begin
  select * into p from public.game_players where token = p_token; if p.id is null then raise exception 'BAD_TOKEN'; end if;
  select * into g from public.games where id = p.game_id;
  q := case when g.qi >= 0 then g.questions->g.qi end;
  select * into a from public.game_answers where player_id = p.id and qi = g.qi;
  select count(*) + 1 into rank from public.game_players where game_id = g.id and score > p.score;
  select count(*) into n from public.game_players where game_id = g.id;
  return jsonb_build_object('state', g.state, 'qi', g.qi, 'total', jsonb_array_length(g.questions), 'title', g.title,
    'q', case when q is null or g.state = 'lobby' then null else jsonb_build_object('type', q->>'type', 'body', q->>'body', 'n', jsonb_array_length(coalesce(q->'options','[]')), 'opts', q->'options_t', 'time', coalesce((g.settings->>'time')::int, 20),
      'left', greatest(0, coalesce((g.settings->>'time')::int, 20) - extract(epoch from (now() - g.q_started_at))::int), 'correct', case when g.state in ('reveal','end') then q->'correct' end) end,
    'answered', a.choice is not null, 'ok', case when g.state in ('reveal','end') then a.ok end, 'pts', case when g.state in ('reveal','end') then a.pts end,
    'score', p.score, 'rank', rank, 'players', n, 'nick', p.nick);
end $$;

create or replace function public.game_answer(p_token text, p_qi int, p_choice text) returns jsonb language plpgsql security definer set search_path = public as $$
declare p record; g record; q jsonb; ok boolean; el numeric; t int; pts int := 0; cor jsonb; ch jsonb;
begin
  select * into p from public.game_players where token = p_token; if p.id is null then raise exception 'BAD_TOKEN'; end if;
  select * into g from public.games where id = p.game_id;
  if g.state <> 'question' or g.qi <> p_qi then raise exception 'CLOSED'; end if;
  t := coalesce((g.settings->>'time')::int, 20); el := extract(epoch from (now() - g.q_started_at));
  if el > t + 1 then raise exception 'CLOSED'; end if;
  if exists (select 1 from public.game_answers where player_id = p.id and qi = p_qi) then raise exception 'DONE'; end if;
  q := g.questions->g.qi; cor := q->'correct';
  begin ch := p_choice::jsonb; exception when others then ch := to_jsonb(p_choice); end;
  if jsonb_typeof(cor) = 'array' then ok := (select coalesce(array_agg(x order by x), '{}') from jsonb_array_elements_text(cor) x) = (select coalesce(array_agg(x order by x), '{}') from jsonb_array_elements_text(case when jsonb_typeof(ch) = 'array' then ch else jsonb_build_array(ch) end) x);
  else ok := cor #>> '{}' = coalesce(ch #>> '{}', p_choice); end if;
  if ok then pts := round(1000 * (1 - least(el, t) / t / 2)) + least(p.streak, 5) * 50; end if;
  insert into public.game_answers(game_id, player_id, qi, choice, ok, pts, ms) values (g.id, p.id, p_qi, p_choice, ok, pts, (el * 1000)::int);
  update public.game_players set score = score + pts, streak = case when ok then streak + 1 else 0 end where id = p.id;
  return jsonb_build_object('received', true);
end $$;

-- مجموعة ألعاب ذاتية (تدريب): الأسئلة مع الإجابات لأنها للتدريب الذاتي
create or replace function public.game_set_public(p_code text) returns jsonb language plpgsql security definer set search_path = public as $$
declare s record;
begin
  select * into s from public.game_sets where code = btrim(p_code) and active; if s.id is null then raise exception 'BAD_CODE'; end if;
  update public.game_sets set plays = plays + 1 where id = s.id;
  return jsonb_build_object('title', s.title, 'modes', s.modes, 'subject', (select name from public.subjects where id = s.subject_id), 'school', (select name from public.schools where id = s.school_id),
    'questions', coalesce((select jsonb_agg(jsonb_build_object('type', x.qtype, 'body', x.body, 'image', x.image_url, 'options', x.options, 'answer', x.answer) order by array_position(s.question_ids, x.id)) from public.questions x where x.id = any(s.question_ids)), '[]'));
end $$;
create or replace function public.game_host(p_game uuid, p_act text) returns jsonb language plpgsql security definer set search_path = public as $$
declare g record;
begin
  select * into g from public.games where id = p_game;
  if g.id is null or not (g.host = public.me() or (public.is_owner() and g.school_id = public.my_school())) then raise exception 'no permission'; end if;
  if p_act = 'next' then
    if g.qi + 1 >= jsonb_array_length(g.questions) then update public.games set state = 'end' where id = g.id;
    else update public.games set state = 'question', qi = g.qi + 1, q_started_at = now() where id = g.id; end if;
  elsif p_act = 'reveal' then update public.games set state = 'reveal' where id = g.id;
  elsif p_act = 'end' then update public.games set state = 'end' where id = g.id;
  elsif p_act = 'restart' then delete from public.game_answers where game_id = g.id; update public.game_players set score = 0, streak = 0 where game_id = g.id; update public.games set state = 'lobby', qi = -1, q_started_at = null where id = g.id;
  end if;
  return (select jsonb_build_object('state', state, 'qi', qi, 'at', q_started_at, 'now', now()) from public.games where id = g.id);
end $$;
grant execute on function public.game_host(uuid, text) to authenticated;
grant execute on function public.game_join(text, text) to anon, authenticated;
grant execute on function public.game_state(text) to anon, authenticated;
grant execute on function public.game_answer(text, int, text) to anon, authenticated;
grant execute on function public.game_set_public(text) to anon, authenticated;
select 'ok';
