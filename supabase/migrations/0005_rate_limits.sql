-- 0005_rate_limits.sql
--
-- Temuan (tinggi): tidak ada rate limit di mana pun. Yang paling terasa:
--   * GET /api/cashier menerima token mentah -> bisa di-brute-force
--   * kedua webhook (Midtrans, Telegram) bisa dibanjiri POST
--
-- Kenapa tabel Postgres dan bukan variabel di memori: Vercel menjalankan
-- setiap route di instance serverless yang bisa mati/berganti kapan saja, jadi
-- counter di memori praktis tidak pernah akurat. Tabel ini juga tidak menambah
-- dependensi baru (tanpa Redis / Upstash).
--
-- Model: satu baris per (bucket, window). Window bergulir per detik penuh
-- sehingga tidak perlu job pembersih yang rumit -- baris lama dibuang oleh
-- fungsi yang sama saat dipanggil.

create table if not exists public.rate_limits (
  bucket text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, window_start)
);

create index if not exists rate_limits_window_idx on public.rate_limits (window_start);

-- Tidak ada policy sama sekali: hanya service role (yang melewati RLS) boleh
-- menyentuh tabel ini.
alter table public.rate_limits enable row level security;

-- =====================================================================
-- consume_rate_limit(bucket, limit, window_seconds)
-- =====================================================================
-- Mengembalikan allowed = false kalau kuota untuk window ini sudah habis.
--
-- Atomik: `insert ... on conflict do update set hits = hits + 1 returning hits`
-- membuat penambahan dan pembacaan terjadi dalam satu pernyataan, jadi dua
-- request bersamaan tidak bisa sama-sama membaca hits yang sama.
create or replace function public.consume_rate_limit(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer default 60
)
returns table (allowed boolean, hits integer, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_window_start timestamptz;
  v_hits integer;
begin
  -- Bulatkan waktu sekarang ke awal window (fixed window counter).
  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / greatest(p_window_seconds, 1)) * greatest(p_window_seconds, 1)
  );

  insert into public.rate_limits as rl (bucket, window_start, hits)
  values (p_bucket, v_window_start, 1)
  on conflict (bucket, window_start)
  do update set hits = rl.hits + 1
  returning rl.hits into v_hits;

  -- Bersihkan jejak window lama sambil jalan (murah, terindeks).
  delete from public.rate_limits
  where window_start < now() - interval '1 hour';

  return query
  select
    v_hits <= p_limit,
    v_hits,
    greatest(
      1,
      ceil(extract(epoch from (v_window_start + make_interval(secs => p_window_seconds) - now())))::integer
    );
end;
$fn$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public;
revoke all on function public.consume_rate_limit(text, integer, integer) from anon;
revoke all on function public.consume_rate_limit(text, integer, integer) from authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
