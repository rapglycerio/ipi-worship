-- =============================================================
-- Título único normalizado — impede duplicatas em re-imports
-- =============================================================
-- Contexto: em jun/2026 foram limpas 4 duplicatas (329→325 músicas),
-- mas sem constraint qualquer re-import pode recriá-las.
-- Verificado em 02/07/2026: nenhuma duplicata existente, seguro aplicar.
--
-- Normalização: minúsculas + trim + espaços internos colapsados.
-- Aplicar no SQL Editor do Supabase (ou via CLI).
-- =============================================================

create unique index if not exists master_songs_normalized_title_key
  on master_songs (lower(regexp_replace(btrim(title), '\s+', ' ', 'g')));
