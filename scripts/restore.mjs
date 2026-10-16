import { existsSync, copyFileSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs, context, checkedPristine, assertOriginal, assertNoPending, assertStopped, withLock, recoverPending, pairHash, samePair, readJson, commitPair, stageDirectory, assertSignature, assertExternal } from './lib/env.mjs';
import { loadPatchSet } from './lib/patch.mjs';
import { inspectFuse } from './lib/fuses.mjs';

try {
  const args = parseArgs(); if (args.dryRun) throw new Error('Use restore --check for read-only inspection');
  const ctx = context(args); const set = loadPatchSet(ctx.manifest.appVersion);
  const run = () => {
    if (args.check) assertNoPending(ctx);
    else if (recoverPending(ctx)) { process.exitCode = 2; return; }
    const pristine = checkedPristine(ctx, set.patches);
    const current = pairHash(ctx.files);
    assertExternal(ctx);
    if (samePair(current, ctx.manifest.original)) {
      assertOriginal(ctx.files, ctx, set.patches);
      if (existsSync(ctx.applied)) throw new Error('Original files with stale applied record; inconsistent state');
      console.log(pristine ? '已还原 / Restored: original pair, fuse enabled, signature Valid.' : '干净、可采集 / Clean, eligible for pristine capture.'); return;
    }
    if (!pristine) throw new Error('Abnormal state: no validated pristine to restore');
    if (!existsSync(ctx.applied)) throw new Error('Abnormal state: changed files without applied record');
    const applied = readJson(ctx.applied);
    if (applied.home !== ctx.normalized || applied.appVersion !== ctx.manifest.appVersion || !['exe','asar'].every(name => current[name] === applied.pair[name] || current[name] === ctx.manifest.original[name])) throw new Error('Abnormal/unknown target content; refusing overwrite');
    if (args.check) { console.log(samePair(current, applied.pair) ? '已应用、可还原 / Applied, restorable.' : '异常 / Partial pair, recoverable from validated pristine.'); if (!samePair(current, applied.pair)) process.exitCode = 1; return; }
    assertStopped(ctx);
    const stage = stageDirectory(); const staged = { exe: join(stage, 'factory-desktop.exe'), asar: join(stage, 'app.asar') };
    for (const name of ['exe','asar']) copyFileSync(pristine[name], staged[name]);
    assertOriginal(staged, ctx, set.patches);
    commitPair(ctx, staged, current, null);
    if (!samePair(pairHash(ctx.files), ctx.manifest.original) || !inspectFuse(readFileSync(ctx.files.exe), ctx.manifest.fuse).enabled) throw new Error('Restore final verification failed');
    assertSignature(ctx.files.exe);
    console.log('Restored original pair, enabled fuse, Valid signature; user preferences unchanged.');
  };
  if (args.check) run(); else withLock(ctx, run);
} catch (error) { console.error(error.message); process.exitCode = 1; }
