/**
 * Captura screenshots do app em viewport de iPhone para a página /como-usar.
 *
 * Uso: node scripts/capture-help-shots.mjs [baseUrl]
 *   1. next build && next start (ou passe a URL de um servidor já rodando)
 *   2. node scripts/capture-help-shots.mjs http://localhost:3457
 *
 * Requer Microsoft Edge instalado (usa puppeteer-core, sem Chromium embutido).
 * Saída: public/ajuda/*.png
 */
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.argv[2] || 'http://localhost:3457';
const OUT = join(process.cwd(), 'public', 'ajuda');

// Prefira chrome-headless-shell (Edge do Windows recusa headless silenciosamente):
//   npx @puppeteer/browsers install chrome-headless-shell@stable --path <dir>
// e passe o caminho em CHROME_PATH.
const EDGE_PATHS = [
  process.env.CHROME_PATH,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean);

// [arquivo, rota, seletor que indica que os dados client-side carregaram]
const SHOTS = [
  ['home', '/', 'main'],
  ['musicas', '/musicas', 'main a[href^="/musica/"]'],
  ['cifra', '/musica/b12f2ec5-1936-436d-a4fa-ebafa820990d', '.glass-strong'],
  ['playlists', '/playlists', 'main'],
  ['playlist', '/playlists/822469e9-dd28-431a-abd8-f39be227b528', 'main a[href^="/musica/"]'],
  ['busca', '/busca', 'main input'],
];

async function findEdge() {
  const { existsSync } = await import('node:fs');
  const found = EDGE_PATHS.find((p) => existsSync(p));
  if (!found) throw new Error('Edge não encontrado — ajuste EDGE_PATHS.');
  return found;
}

const browser = await puppeteer.launch({
  executablePath: await findEdge(),
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--force-dark-mode'],
});

mkdirSync(OUT, { recursive: true });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 780, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

for (const [name, route, waitFor] of SHOTS) {
  const url = BASE + route;
  process.stdout.write(`→ ${url} ... `);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  try {
    await page.waitForSelector(waitFor, { timeout: 15000 });
  } catch {
    process.stdout.write('(seletor não apareceu, capturando mesmo assim) ');
  }
  // Fontes web + skeletons client-side
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: join(OUT, `${name}.png`) });
  console.log(`salvo ajuda/${name}.png`);
}

await browser.close();
console.log('Concluído.');
