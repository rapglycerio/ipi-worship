import { NextResponse } from 'next/server';
import {
  createAppUser,
  deletePasswordHash,
  getAppUserByEmail,
  getPasswordHash,
  setPasswordHash,
} from '@/lib/data-admin';
import { hashPassword, isValidEmail, MIN_PASSWORD_LENGTH, normalizeEmail } from '@/lib/password';

/**
 * Cadastro aberto com e-mail e senha. A conta nasce como "visitor" (padrão do
 * banco), igual a quem entra pelo Google pela primeira vez.
 *
 * Não permite cadastrar e-mail que já existe (ex.: alguém que entra pelo Google):
 * senão qualquer pessoa poderia pôr senha na conta de outra e herdar o papel dela.
 * Para dar senha a uma conta existente, o admin usa "Definir senha" em Usuários.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 80) : '';
  const email = typeof body?.email === 'string' ? normalizeEmail(body.email) : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!name) return NextResponse.json({ error: 'Informe seu nome.' }, { status: 400 });
  if (!isValidEmail(email)) return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 });
  if (password.length < MIN_PASSWORD_LENGTH || password.length > 200) {
    return NextResponse.json(
      { error: `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.` },
      { status: 400 }
    );
  }

  const [existingUser, existingHash] = await Promise.all([getAppUserByEmail(email), getPasswordHash(email)]);
  if (existingUser || existingHash) {
    return NextResponse.json(
      { error: 'Este e-mail já está cadastrado. Entre com Google ou peça ao administrador para definir uma senha.' },
      { status: 409 }
    );
  }

  // Senha primeiro: se falhar, nada foi criado. Se criar o usuário falhar, desfaz a senha.
  const saved = await setPasswordHash(email, await hashPassword(password));
  if (!saved) return NextResponse.json({ error: 'Não foi possível criar a conta.' }, { status: 500 });

  const created = await createAppUser(email, name);
  if (!created) {
    await deletePasswordHash(email);
    return NextResponse.json({ error: 'Não foi possível criar a conta.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
