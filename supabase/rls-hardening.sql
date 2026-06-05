-- =============================================================
-- RLS Hardening — close the worst holes
-- =============================================================
-- ⚠️  APLIQUE SOMENTE DEPOIS de configurar SUPABASE_SERVICE_ROLE_KEY
--     no .env.local E na Vercel, e fazer o redeploy. Caso contrário o
--     login deixa de registrar usuários e os admins perdem acesso.
--
-- O que isto faz:
--   • app_users  → anon NÃO pode mais escrever (ninguém vira admin sozinho).
--                  Escrita só via service_role (servidor), que ignora RLS.
--   • master_songs / playlists → anon NÃO pode mais DELETAR (sem exclusão
--                  em massa). Exclusão só via API route autenticada.
--
-- Leitura pública e inserção/edição de músicas/blocos continuam abertas
-- (essas não estão no escopo "piores buracos").
-- =============================================================

-- 1) app_users: remove a política de escrita aberta (mantém leitura pública)
DROP POLICY IF EXISTS "escrita_aberta" ON app_users;

-- 2) Impede exclusão anônima de músicas e playlists
DROP POLICY IF EXISTS "Anon users can delete songs"     ON master_songs;
DROP POLICY IF EXISTS "Anon users can delete playlists" ON playlists;

-- Verificação (opcional): liste as políticas restantes
-- SELECT tablename, policyname, cmd FROM pg_policies
-- WHERE schemaname='public' AND tablename IN ('app_users','master_songs','playlists')
-- ORDER BY tablename, cmd;
