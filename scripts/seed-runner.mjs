import nextEnv from '@next/env';
import { spawnSync } from 'node:child_process';
nextEnv.loadEnvConfig(process.cwd());
const r = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/seed.ts', ...process.argv.slice(2)], { stdio: 'inherit', env: process.env });
process.exit(r.status ?? 1);
