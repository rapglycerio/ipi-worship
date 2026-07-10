/**
 * Normaliza texto para busca: minúsculas, sem acento, sem espaços nas pontas.
 * Assim "tu es " encontra "Tu És" e vice-versa.
 */
export function normalizeSearch(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

type SearchableFields = {
  title: string;
  artists?: (string | null | undefined)[];
  composer?: string | null;
  lyrics?: (string | null | undefined)[];
};

/**
 * Pontuação de relevância: quanto menor, melhor. `null` = não bateu em nada.
 * Título > artista/compositor > letra, para nome da música vir sempre primeiro.
 */
export function searchRank(fields: SearchableFields, query: string): number | null {
  const q = normalizeSearch(query);
  if (!q) return 0;

  const title = normalizeSearch(fields.title);
  if (title.startsWith(q)) return 0;
  if (title.includes(q)) return 1;
  if (fields.artists?.some((a) => normalizeSearch(a).includes(q))) return 2;
  if (fields.composer && normalizeSearch(fields.composer).includes(q)) return 2;
  if (fields.lyrics?.some((l) => normalizeSearch(l).includes(q))) return 3;
  return null;
}
