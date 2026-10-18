import { spawnSync } from 'node:child_process';
for (const args of [['run','lint'], ['run','build'], ['exec','tsc','--','--noEmit']]) {
 const r = spawnSync('npm', args, {stdio:'inherit'});
 if (r.status !== 0) process.exit(r.status ?? 1);
}
console.log('BUILD_VERIFIED');
