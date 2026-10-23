import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const rootDir = process.cwd();
const standaloneDir = path.join(rootDir, '.next', 'standalone');
const staticSrc = path.join(rootDir, '.next', 'static');
const staticDest = path.join(standaloneDir, '.next', 'static');
const publicSrc = path.join(rootDir, 'public');
const publicDest = path.join(standaloneDir, 'public');

if (fs.existsSync(standaloneDir)) {
  // Ensure static and public directories are synced to standalone location
  if (fs.existsSync(staticSrc)) {
    fs.cpSync(staticSrc, staticDest, { recursive: true });
  }
  if (fs.existsSync(publicSrc)) {
    fs.cpSync(publicSrc, publicDest, { recursive: true });
  }

  const serverJs = path.join(standaloneDir, 'server.js');
  const port = process.env.PORT || '3000';
  console.log(`🚀 Starting Next.js standalone server on port ${port}...`);

  const child = spawn(process.execPath, [serverJs], {
    cwd: standaloneDir,
    stdio: 'inherit',
    env: { ...process.env, PORT: String(port) },
  });

  child.on('exit', (code) => process.exit(code ?? 0));
} else {
  const nextBin = path.join(rootDir, 'node_modules', '.bin', 'next');
  const child = spawn(nextBin, ['start', ...process.argv.slice(2)], {
    cwd: rootDir,
    stdio: 'inherit',
    env: process.env,
  });
  child.on('exit', (code) => process.exit(code ?? 0));
}
