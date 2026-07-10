-- =============================================================
-- Playlists particulares — só o dono enxerga
-- =============================================================
-- Contexto: pedido do Raphael para criar playlists de ensaio pessoal,
-- fora das listas públicas. Como a leitura de `playlists` era 100% aberta
-- (sem conceito de usuário/dono na RLS), isso exigiu:
--   1) colunas is_private / owner_email;
--   2) a policy de SELECT pública passa a excluir is_private = true;
--   3) idem para worship_arrangements (senão as músicas de uma playlist
--      particular continuavam listáveis por qualquer anon que soubesse o
--      playlist_id);
--   4) o dono enxerga suas playlists particulares via
--      /api/playlists/private, que confere a sessão NextAuth e usa o
--      service_role (que ignora RLS) — o cliente anônimo nunca lê is_private.
--
-- ✅ APLICADO em produção em 2026-07-10 (migration private_playlists).
-- =============================================================

alter table playlists
  add column if not exists is_private  boolean not null default false,
  add column if not exists owner_email text;

drop policy if exists "Playlists are viewable by everyone" on playlists;
create policy "Public playlists are viewable by everyone" on playlists
  for select
  using (is_private = false);

drop policy if exists "Arrangements are viewable by everyone" on worship_arrangements;
create policy "Public arrangements are viewable by everyone" on worship_arrangements
  for select
  using (
    exists (
      select 1 from playlists p
      where p.id = worship_arrangements.playlist_id and p.is_private = false
    )
  );
