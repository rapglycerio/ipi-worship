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
