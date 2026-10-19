import { parseArgs, context, assertNoPending, checkedPristine, assertApplied } from './lib/env.mjs';
import { loadPatchSet, loadAddedFiles } from './lib/patch.mjs';
import { existsSync } from 'node:fs';

try {
  const args = parseArgs(); if (args.dryRun || args.check) throw new Error('verify only accepts --home');
  const ctx = context(args); assertNoPending(ctx);
  const set = loadPatchSet(ctx.manifest.appVersion);
  checkedPristine(ctx, set.patches);
  if (!existsSync(ctx.applied)) assertApplied(ctx, set.patches, new Map());
  assertApplied(ctx, set.patches, loadAddedFiles(set));
  console.log(`已应用 / Applied: pair hashes, ${ctx.manifest.patchShape.edits} markers, resources, fuse and unpacked files verified.`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
