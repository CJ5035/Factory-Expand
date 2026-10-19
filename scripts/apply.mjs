import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs, context, checkedPristine, capturePristine, assertOriginal, assertNoPending, assertApplied, assertStopped, withLock, recoverPending, pairHash, commitPair, stageDirectory } from './lib/env.mjs';
import { loadPatchSet, buildReplacements, loadAddedFiles } from './lib/patch.mjs';
import { openAsar, closeAsar, writeRepacked, holderFromOpenAsar, selfCheck, sha256, readEntry, findEntry, integrityOf, listEntries } from './lib/asar.mjs';
import { patchFuse } from './lib/fuses.mjs';
import { checkJavaScript } from './lib/syntaxcheck.mjs';
import { validateArchive } from '../tools/extract_en.mjs';

try {
  const args = parseArgs(); if (args.check) throw new Error('--check is only for restore');
  const ctx = context(args);
  const set = loadPatchSet(ctx.manifest.appVersion);
  const run = () => {
    if (args.dryRun) assertNoPending(ctx);
    else if (recoverPending(ctx)) { process.exitCode = 2; return; }
    const pristine = checkedPristine(ctx, set.patches);
    const added = loadAddedFiles(set);
    if (existsSync(ctx.applied)) {
      assertApplied(ctx, set.patches, added);
      console.log('Already applied; no changes.'); return;
    }
    assertOriginal(ctx.files, ctx, set.patches);
    validateArchive(ctx.files.asar);
    const before = pairHash(ctx.files);
    const input = pristine ?? ctx.files;
    const stage = stageDirectory();
    const staged = { exe: join(stage, 'factory-desktop.exe'), asar: join(stage, 'app.asar') };
    const original = openAsar(input.asar);
    try {
      const { replace, report } = buildReplacements(original, set);
      for (const [path, bytes] of added) if (path.endsWith('.json')) JSON.parse(bytes.toString('utf8'));
      const syntax = checkJavaScript(new Map([...replace, ...added]));
      if (syntax.failures.length) throw new Error(`JavaScript syntax gate failed: ${JSON.stringify(syntax.failures)}`);
      writeRepacked(original, { replace, add: added }, staged.asar);
      const output = openAsar(staged.asar);
      try {
        const checked = selfCheck(holderFromOpenAsar(original), holderFromOpenAsar(output), new Set([...replace.keys(), ...added.keys()]));
        if (checked.mismatches.length) throw new Error(checked.mismatches.join('\n'));
        for (const [path, bytes] of [...replace, ...added]) {
          if (!readEntry(output, path).equals(bytes) || JSON.stringify(findEntry(output.header, path).integrity) !== JSON.stringify(integrityOf(bytes))) throw new Error(`Staged content/integrity mismatch: ${path}`);
        }
        for (const item of listEntries(original).filter(item => item.unpacked)) if (JSON.stringify(findEntry(original.header,item.path)) !== JSON.stringify(findEntry(output.header,item.path))) throw new Error(`Unpacked metadata changed: ${item.path}`);
        console.log(`Staged archive PASS: ${checked.checked} unchanged entries, ${checked.changedSeen} changed/added, ${syntax.checked} JS syntax gates.`);
      } finally { closeAsar(output); }
      console.log(JSON.stringify(report));
    } finally { closeAsar(original); }
    writeFileSync(staged.exe, patchFuse(readFileSync(input.exe), ctx.manifest));
    if (args.dryRun) { console.log(`Dry-run PASS; staged output: ${stage}; install/pristine/state unchanged.`); return; }
    assertStopped(ctx);
    capturePristine(ctx, set.patches);
    const record = { home: ctx.normalized, appVersion: ctx.manifest.appVersion, pair: pairHash(staged), resources: Object.fromEntries([...added].map(([path, bytes]) => [path, sha256(bytes)])) };
    commitPair(ctx, staged, before, record);
    assertApplied(ctx, set.patches, added);
    console.log('Applied Chinese localization.');
  };
  if (args.dryRun) run(); else withLock(ctx, run);
} catch (error) { console.error(error.message); process.exitCode = 1; }
