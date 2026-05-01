-- =============================================================
-- IPI Worship — Schema Supabase
-- Execute no Supabase SQL Editor (Dashboard > SQL Editor)
-- =============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------
-- TABELAS
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS master_songs (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  title             TEXT        NOT NULL,
  original_composer TEXT,
  nature            TEXT        NOT NULL DEFAULT 'louvor'
                                CHECK (nature IN ('louvor', 'hino')),
  searchable_lyrics TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS song_liturgical_tags (
  id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  song_id UUID NOT NULL REFERENCES master_songs(id) ON DELETE CASCADE,
  tag_id  TEXT NOT NULL CHECK (tag_id IN (
    'introducao','exaltacao','adoracao','intercessao','perdao',
    'ceia','consagracao','despedida','ofertorio','apelo'
  )),
  UNIQUE (song_id, tag_id)
);

CREATE TABLE IF NOT EXISTS theological_analyses (
  id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  song_id              UUID        NOT NULL REFERENCES master_songs(id) ON DELETE CASCADE,
  status               TEXT        NOT NULL DEFAULT 'pending'
                                   CHECK (status IN ('approved','rejected','pending')),
  justification        TEXT,
  analyzed_by          TEXT,
  analyzed_at          TIMESTAMPTZ,
  scripture_references TEXT[]      DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS song_versions (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  master_song_id UUID        NOT NULL REFERENCES master_songs(id) ON DELETE CASCADE,
  key            TEXT        NOT NULL DEFAULT 'C',
  bpm            INTEGER     DEFAULT 0,
  youtube_url    TEXT,
  source_url     TEXT,
  is_default     BOOLEAN     DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS version_artists (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version_id  UUID NOT NULL REFERENCES song_versions(id) ON DELETE CASCADE,
  artist_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chord_blocks (
  id           UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  version_id   UUID    NOT NULL REFERENCES song_versions(id) ON DELETE CASCADE,
  type         TEXT    NOT NULL DEFAULT 'verse',
  label        TEXT,
  sort_order   INTEGER DEFAULT 0,
  repeat_count INTEGER DEFAULT 1,
  directions   JSONB   DEFAULT '[]'::jsonb,
  lines        JSONB   DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS playlists (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT        NOT NULL,
  service_type TEXT        NOT NULL DEFAULT 'manha'
                           CHECK (service_type IN ('manha','noite','especial','estudo')),
  service_date DATE        NOT NULL,
  created_by   TEXT        DEFAULT 'Sistema',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS worship_arrangements (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  playlist_id       UUID        NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  master_song_id    UUID        NOT NULL REFERENCES master_songs(id) ON DELETE CASCADE,
  version_id        UUID        REFERENCES song_versions(id) ON DELETE SET NULL,
  block_order       TEXT[]      DEFAULT '{}',
  custom_directions JSONB,
  transposed_key    TEXT,
  sort_order        INTEGER     DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Usuários com papéis (member/admin). Populado no primeiro login via Google OAuth.
CREATE TABLE IF NOT EXISTS app_users (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  email        TEXT        UNIQUE NOT NULL,
  display_name TEXT,
  photo_url    TEXT,
  role         TEXT        NOT NULL DEFAULT 'visitor'
                           CHECK (role IN ('visitor','member','admin')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- TRIGGERS — atualiza updated_at automaticamente
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_master_songs_updated_at
  BEFORE UPDATE ON master_songs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_song_versions_updated_at
  BEFORE UPDATE ON song_versions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_playlists_updated_at
  BEFORE UPDATE ON playlists
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- Leitura pública + escrita aberta via anon key.
-- Ajuste as políticas de escrita conforme o nível de segurança desejado.
-- -------------------------------------------------------------

ALTER TABLE master_songs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_liturgical_tags   ENABLE ROW LEVEL SECURITY;
ALTER TABLE theological_analyses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_versions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE version_artists        ENABLE ROW LEVEL SECURITY;
ALTER TABLE chord_blocks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists              ENABLE ROW LEVEL SECURITY;
ALTER TABLE worship_arrangements   ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users              ENABLE ROW LEVEL SECURITY;

-- Leitura pública
CREATE POLICY "leitura_publica" ON master_songs         FOR SELECT USING (true);
CREATE POLICY "leitura_publica" ON song_liturgical_tags FOR SELECT USING (true);
CREATE POLICY "leitura_publica" ON theological_analyses FOR SELECT USING (true);
CREATE POLICY "leitura_publica" ON song_versions        FOR SELECT USING (true);
CREATE POLICY "leitura_publica" ON version_artists      FOR SELECT USING (true);
CREATE POLICY "leitura_publica" ON chord_blocks         FOR SELECT USING (true);
CREATE POLICY "leitura_publica" ON playlists            FOR SELECT USING (true);
CREATE POLICY "leitura_publica" ON worship_arrangements FOR SELECT USING (true);
CREATE POLICY "leitura_publica" ON app_users            FOR SELECT USING (true);

-- Escrita aberta (proteja por role em produção)
CREATE POLICY "escrita_aberta" ON master_songs         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "escrita_aberta" ON song_liturgical_tags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "escrita_aberta" ON theological_analyses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "escrita_aberta" ON song_versions        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "escrita_aberta" ON version_artists      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "escrita_aberta" ON chord_blocks         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "escrita_aberta" ON playlists            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "escrita_aberta" ON worship_arrangements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "escrita_aberta" ON app_users            FOR ALL USING (true) WITH CHECK (true);

-- -------------------------------------------------------------
-- DADOS INICIAIS (opcional — remove se não quiser seed)
-- -------------------------------------------------------------

-- Insira um admin inicial (troque o email):
-- INSERT INTO app_users (email, display_name, role)
-- VALUES ('seu-email@gmail.com', 'Admin', 'admin')
-- ON CONFLICT (email) DO UPDATE SET role = 'admin';
