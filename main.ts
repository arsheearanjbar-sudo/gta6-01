// NEON TIDE — a sun-soaked coastal open-world crime game in Solara Bay,
// built as plain static files under game/ that any static server can host.
// This program hands the entry in: it copies game/ and screenshots/ from
// beside this file into the output directory and writes dossier.json,
// the summary the judge reads, using the vendored make.fun library.
//
// Play it locally by serving game/ (for example with the kit's serve.ts)
// and opening the page in a desktop browser. Outside the grader's
// container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const dest = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const gameSrc = join(root, 'game');
const shotsSrc = join(root, 'screenshots');

mkdirSync(dest, { recursive: true });
cpSync(gameSrc, join(dest, 'game'), { recursive: true });
mkdirSync(join(dest, 'screenshots'), { recursive: true });
if (existsSync(shotsSrc)) {
  cpSync(shotsSrc, join(dest, 'screenshots'), { recursive: true });
}

// The dossier is byte for byte what the library writes from the copied
// files, with the gate's own caps applied so a bad entry is refused here
// instead of at the scorer.
const dossier = buildDossier(dest, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(dest, 'dossier.json'), dossier);
