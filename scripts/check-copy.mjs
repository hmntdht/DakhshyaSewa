// Usage: npm run check:copy. Fails if the code uses a UI string key that is missing from src/lib/i18n/copy.ts.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const files = walk('src').filter((f) => /\.tsx?$/.test(f) && !f.endsWith('copy.ts'));
const defined = new Set([...readFileSync('src/lib/i18n/copy.ts', 'utf8').matchAll(/^ "([a-z0-9_.]+)": \{/gm)].map((m) => m[1]));
const used = new Map();
for (const f of files) for (const m of readFileSync(f, 'utf8').matchAll(/(?:\bk=["']|\bt\(["']|\bts\(["']|\bT k=\{?["'])([a-z][a-z0-9_.]+)["']/g)) used.set(m[1], f);
const missing = [...used].filter(([k]) => !defined.has(k));
if (missing.length) { console.error('Missing copy keys:\n' + missing.map(([k, f]) => `  ${k}  (${f})`).join('\n')); process.exit(1); }
console.log(`✔ ${used.size} keys used, ${defined.size} defined`);
