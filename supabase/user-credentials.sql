-- Login com e-mail e senha (além do Google).
-- Tabela SEPARADA de app_users de propósito: app_users tem leitura pública,
-- e o hash de senha nunca pode ser lido pelo cliente anônimo.
-- RLS ligado e NENHUMA policy => só o service_role (rotas do servidor) acessa.
CREATE TABLE IF NOT EXISTS public.user_credentials (
  email         text        PRIMARY KEY,
  password_hash text        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_credentials FROM anon, authenticated;

COMMENT ON TABLE public.user_credentials IS
  'Hash scrypt das senhas de login por e-mail. Acesso só via service_role.';
