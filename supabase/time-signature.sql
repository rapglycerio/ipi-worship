-- Fórmula de compasso por versão da música (4/4, 3/4, 6/8...).
-- Aditiva e opcional: NULL = não informado (o app trata como 4/4 no metrônomo).
ALTER TABLE public.song_versions
  ADD COLUMN IF NOT EXISTS time_signature text
  CHECK (time_signature IS NULL OR time_signature ~ '^[0-9]{1,2}/(2|4|8|16)$');

COMMENT ON COLUMN public.song_versions.time_signature IS
  'Fórmula de compasso, ex.: 4/4, 3/4, 6/8. NULL = não informado.';
