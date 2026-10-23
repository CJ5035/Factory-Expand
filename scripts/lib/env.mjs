import { readFileSync, writeFileSync, existsSync, realpathSync, mkdirSync, copyFileSync, renameSync, unlinkSync, openSync, closeSync, fsyncSync, chmodSync, mkdtempSync } from 'node:fs';
import { dirname, join, resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { openAsar, closeAsar, readEntry, sha256, findEntry } from './asar.mjs';
import { inspectFuse } from './fuses.mjs';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const windowsPowerShell = join(process.env.SystemRoot ?? 'C:\\Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe');
const psPrefix = "$ErrorActionPreference='Stop'; $env:PSModulePath=Join-Path $env:WINDIR 'System32\\WindowsPowerShell\\v1.0\\Modules'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false); $OutputEncoding=[Console]::OutputEncoding; ";
export const patchSetDir = (version) => join(REPO_ROOT, 'patches', version);
export const fileHash = (file) => sha256(readFileSync(file));
export const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
export const pairHash = (files) => ({ exe: fileHash(files.exe), asar: fileHash(files.asar) });
export const samePair = (left, right) => !!left && !!right && left.exe === right.exe && left.asar === right.asar;

export function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (const arg of argv) {
    if (arg.startsWith('--home=') && !args.home) args.home = arg.slice(7);
    else if (arg === '--dry-run' && !args.dryRun) args.dryRun = true;
    else if (arg === '--check' && !args.check) args.check = true;
    else throw new Error(`Unknown/duplicate argument: ${arg}`);
  }
  if (!args.home || !isAbsolute(args.home)) throw new Error('Required: --home=<absolute version directory>');
  return args;
}

export function context(args) {
  const home = realpathSync(args.home);
  const normalized = process.platform === 'win32' ? home.toLowerCase() : home;
  const files = { exe: join(home, 'factory-desktop.exe'), asar: join(home, 'resources/app.asar') };
  for (const file of Object.values(files)) if (!existsSync(file)) throw new Error(`Missing installed file: ${file}`);
  const a = openAsar(files.asar);
  let version;
  try { version = JSON.parse(readEntry(a, 'package.json')).version; } finally { closeAsar(a); }
  if (!['0.200.0', '0.201.0', '0.202.0'].includes(version)) throw new Error(`Unsupported version: ${version}`);
  const manifest = readJson(join(patchSetDir(version), 'manifest.json'));
  const key = sha256(Buffer.from(normalized));
  const state = join(REPO_ROOT, 'state', key);
  const pristineDir = join(REPO_ROOT, 'pristine', version, `${manifest.original.exe}-${manifest.original.asar}`);
  return { args, home, normalized, key, files, manifest, state, applied: join(state, 'applied.json'), pending: join(state, 'pending.json'), lock: join(state, 'lock.json'), pristine: { exe: join(pristineDir, 'factory-desktop.exe'), asar: join(pristineDir, 'app.asar'), manifest: join(pristineDir, 'manifest.json'), dir: pristineDir } };
}

export function powershell(script) {
  if (process.platform !== 'win32') throw new Error('Factory installer requires Windows');
  return execFileSync(windowsPowerShell, ['-NoProfile', '-NonInteractive', '-Command', psPrefix + script], { encoding: 'utf8', windowsHide: true }).trim();
}

export function assertStopped(ctx) {
  const output = powershell('ConvertTo-Json -Compress -InputObject @(Get-CimInstance Win32_Process -Filter "Name=\'factory-desktop.exe\'" | Select-Object ProcessId,ExecutablePath)');
  const processes = JSON.parse(output || '[]');
  for (const item of processes) {
    if (!item.ExecutablePath) throw new Error(`Cannot determine Factory process path: ${item.ProcessId}`);
    if (resolve(item.ExecutablePath).toLowerCase() === ctx.files.exe.toLowerCase()) throw new Error('Close Factory completely, including the tray, before writing.');
  }
}

export function assertSignature(file) {
  const literal = file.replaceAll("'", "''");
  if (powershell(`(Get-AuthenticodeSignature -LiteralPath '${literal}').Status.ToString()`) !== 'Valid') throw new Error(`Original executable signature is not Valid: ${file}`);
}

export function assertExternal(ctx) {
  for (const [path, expected] of Object.entries(ctx.manifest.unpacked)) {
    if (fileHash(join(`${ctx.files.asar}.unpacked`, path)) !== expected) throw new Error(`Unpacked file changed: ${path}`);
  }
}

export function assertOriginal(files, ctx, patches, signature = true) {
  if (!samePair(pairHash(files), ctx.manifest.original)) throw new Error('Original build hash mismatch');
  if (!inspectFuse(readFileSync(files.exe), ctx.manifest.fuse).enabled) throw new Error('Original fuse must be enabled');
  const shape = ctx.manifest.patchShape;
  const expected = { '0.200.0': { targets: 2, addFiles: 2 }, '0.201.0': { targets: 2, addFiles: 2 }, '0.202.0': { targets: 3, addFiles: 4 } }[ctx.manifest.appVersion];
  if (!expected || !shape || shape.targets !== expected.targets || !Number.isInteger(shape.edits) || shape.edits < 3 || shape.addFiles !== expected.addFiles || patches.targets.length !== shape.targets || patches.targets.some(target => !target.edits?.length) || patches.targets.reduce((n,t) => n+t.edits.length,0) !== shape.edits || patches.addFiles?.length !== shape.addFiles || new Set(patches.targets.map(target=>target.file)).size !== shape.targets || new Set(patches.addFiles.map(item=>item.to)).size !== shape.addFiles) throw new Error('Expected the pinned non-empty patch shape from the version manifest');
  const asar = openAsar(files.asar);
  try {
    for (const target of patches.targets) {
      const source = readEntry(asar, target.file).toString('utf8');
      for (const edit of target.edits) if (!edit.find || edit.expect !== 1 || edit.marker !== edit.replace || source.includes(edit.marker) || source.split(edit.find).length !== 2) throw new Error(`Original anchor mismatch: ${target.file}`);
    }
    for (const item of patches.addFiles) if (findEntry(asar.header, item.to)) throw new Error('Original archive already contains added resources');
  } finally { closeAsar(asar); }
  if (signature) assertSignature(files.exe);
  assertExternal(ctx);
}

export function atomicJson(file, value) {
  const temporary = `${file}.${randomUUID()}.tmp`;
  const fd = openSync(temporary, 'wx');
  try { writeFileSync(fd, JSON.stringify(value, null, 2) + '\n'); fsyncSync(fd); } finally { closeSync(fd); }
  renameSync(temporary, file);
}

export function checkedPristine(ctx, patches) {
  if (!existsSync(ctx.pristine.dir)) return null;
  if (!existsSync(ctx.pristine.manifest)) throw new Error('Pristine directory exists without manifest; refusing automatic registration');
  const meta = readJson(ctx.pristine.manifest);
  if (meta.appVersion !== ctx.manifest.appVersion || !samePair(meta.original, ctx.manifest.original)) throw new Error('Pristine manifest mismatch');
  assertOriginal(ctx.pristine, ctx, patches);
  return ctx.pristine;
}

export function capturePristine(ctx, patches) {
  const existing = checkedPristine(ctx, patches);
  if (existing) return existing;
  assertOriginal(ctx.files, ctx, patches);
  mkdirSync(ctx.pristine.dir, { recursive: true });
  copyFileSync(ctx.files.exe, ctx.pristine.exe, 1);
  copyFileSync(ctx.files.asar, ctx.pristine.asar, 1);
  assertOriginal(ctx.pristine, ctx, patches);
  atomicJson(ctx.pristine.manifest, { appVersion: ctx.manifest.appVersion, original: ctx.manifest.original });
  return ctx.pristine;
}

export function assertNoPending(ctx) {
  if (existsSync(ctx.pending)) throw new Error(`Pending recovery required: ${ctx.pending}. Close Factory and run a write operation; read-only commands never recover.`);
  if (existsSync(ctx.lock)) throw new Error(`Target is locked or requires stale-lock recovery: ${ctx.lock}`);
}

export function assertApplied(ctx, patches, added) {
  assertExternal(ctx);
  if (!existsSync(ctx.applied)) throw new Error(samePair(pairHash(ctx.files), ctx.manifest.original) ? 'Not applied' : 'Partial application or unknown build: no applied record');
  const record = readJson(ctx.applied);
  if (record.home !== ctx.normalized || record.appVersion !== ctx.manifest.appVersion || !samePair(pairHash(ctx.files), record.pair)) throw new Error('Partial application or installed pair hash mismatch');
  if (inspectFuse(readFileSync(ctx.files.exe), ctx.manifest.fuse).enabled) throw new Error('Integrity fuse is unexpectedly enabled');
  const asar = openAsar(ctx.files.asar);
  try {
    for (const target of patches.targets) {
      const source = readEntry(asar, target.file).toString('utf8');
      for (const edit of target.edits) if (source.split(edit.marker).length !== 2) throw new Error(`Missing/non-unique marker: ${target.file}`);
    }
    for (const [path, bytes] of added) if (!readEntry(asar, path).equals(bytes) || record.resources?.[path] !== sha256(bytes)) throw new Error('Translation source changed; use restore -> build -> apply');
  } finally { closeAsar(asar); }
  return record;
}

function processIdentity(pid) {
  return powershell(`$p=Get-Process -Id ${Number(pid)} -ErrorAction SilentlyContinue; if($p){$p.StartTime.ToUniversalTime().Ticks.ToString()}else{'exited'}`);
}

export function withLock(ctx, action) {
  // A kernel mutex serializes stale-file takeover as well as ordinary writers.
  // The PowerShell parent owns it for the entire re-executed Node operation;
  // Windows releases it on parent death (AbandonedMutexException is recoverable).
  const lease = `${ctx.key}:${process.ppid}`;
  if (process.env.FACTORY_EXPAND_MUTEX !== lease) {
    const quote = (value) => "'" + String(value).replaceAll("'", "''") + "'";
    const command = psPrefix + `$mutex=[System.Threading.Mutex]::new($false,'Global\\FactoryExpand-${ctx.key}'); $held=$false; try { try { $held=$mutex.WaitOne(0) } catch [System.Threading.AbandonedMutexException] { $held=$true }; if(-not $held){throw 'Another writer owns the target mutex'}; $env:FACTORY_EXPAND_MUTEX='${ctx.key}:'+$PID; & ${quote(process.execPath)} ${process.argv.slice(1).map(quote).join(' ')}; $code=$LASTEXITCODE } finally { if($held){$mutex.ReleaseMutex()}; $mutex.Dispose() }; exit $code`;
    try { execFileSync(windowsPowerShell, ['-NoProfile', '-NonInteractive', '-Command', command], { stdio: 'inherit', windowsHide: true }); }
    catch (error) { if (Number.isInteger(error.status)) process.exitCode = error.status; else throw error; }
    return;
  }
  mkdirSync(ctx.state, { recursive: true });
  if (existsSync(ctx.lock)) {
    const owner = readJson(ctx.lock);
    if (!Number.isInteger(owner.pid) || !owner.identity) throw new Error('Invalid lock owner');
    const identity = processIdentity(owner.pid);
    // A reused PID is not sufficient evidence to remove the previous lock.
    if (identity !== 'exited') throw new Error('Lock owner is alive or cannot be confirmed exited');
    unlinkSync(ctx.lock);
  }
  const identity = processIdentity(process.pid);
  const fd = openSync(ctx.lock, 'wx');
  try { writeFileSync(fd, JSON.stringify({ pid: process.pid, identity })); fsyncSync(fd); } finally { closeSync(fd); }
  try { return action(); } finally {
    const owner = readJson(ctx.lock);
    if (owner.pid !== process.pid || owner.identity !== identity) throw new Error('Lock ownership changed; refusing removal');
    unlinkSync(ctx.lock);
  }
}

export function replaceFile(source, target, expectedCurrent) {
  const temporary = `${target}.${randomUUID()}.tmp`;
  try {
    copyFileSync(source, temporary);
    // A read-only backup is a storage property, not an installed-file property.
    // Keep an existing target's attributes intact so locked/read-only targets
    // still fail safely; only normalize the new temporary file before rename.
    chmodSync(temporary, 0o666);
    if (fileHash(target) !== expectedCurrent) throw new Error(`Target changed before rename: ${target}`);
    renameSync(temporary, target);
  }
  finally { if (existsSync(temporary)) unlinkSync(temporary); }
}

export function recoverPending(ctx) {
  if (!existsSync(ctx.pending)) return false;
  assertStopped(ctx);
  const pending = readJson(ctx.pending);
  if (pending.home !== ctx.normalized || pending.appVersion !== ctx.manifest.appVersion) throw new Error('Pending target/version mismatch');
  const base = join(REPO_ROOT, 'backups', ctx.key) + '\\';
  for (const name of ['exe', 'asar']) {
    if (!resolve(pending.backup[name]).startsWith(base) || fileHash(pending.backup[name]) !== pending.before[name]) throw new Error(`Invalid recovery backup: ${pending.backup[name]}`);
    const current = fileHash(ctx.files[name]);
    if (current !== pending.before[name] && current !== pending.after[name]) throw new Error(`Unknown current bytes; refusing recovery overwrite: ${ctx.files[name]}`);
  }
  for (const name of ['exe', 'asar']) {
    const current = fileHash(ctx.files[name]);
    if (current !== pending.before[name] && current !== pending.after[name]) throw new Error(`Unknown bytes before recovery replacement: ${name}`);
    if (current !== pending.before[name]) {
      replaceFile(pending.backup[name], ctx.files[name], current);
      if (fileHash(ctx.files[name]) !== pending.before[name]) throw new Error(`Recovery readback failed: ${name}`);
    }
  }
  if (!samePair(pairHash(ctx.files), pending.before)) throw new Error('Recovery pair mismatch');
  if (pending.beforeApplied === null) { if (existsSync(ctx.applied)) unlinkSync(ctx.applied); }
  else atomicJson(ctx.applied, pending.beforeApplied);
  if (JSON.stringify(existsSync(ctx.applied) ? readJson(ctx.applied) : null) !== JSON.stringify(pending.beforeApplied)) throw new Error('Recovery applied-record mismatch');
  unlinkSync(ctx.pending);
  console.log('Recovered operation-before pair and applied record. Command stopped; rerun to start a new operation.');
  return true;
}

export function commitPair(ctx, staged, before, nextApplied) {
  assertStopped(ctx);
  assertExternal(ctx);
  if (!samePair(pairHash(ctx.files), before)) throw new Error('Installed files changed before commit');
  const root = join(REPO_ROOT, 'backups', ctx.key); mkdirSync(root, { recursive: true });
  const backupDir = mkdtempSync(join(root, 'operation-'));
  const backup = { exe: join(backupDir, 'factory-desktop.exe'), asar: join(backupDir, 'app.asar') };
  for (const name of ['exe', 'asar']) copyFileSync(ctx.files[name], backup[name]);
  if (!samePair(pairHash(backup), before)) throw new Error('Operation backup mismatch');
  const beforeApplied = existsSync(ctx.applied) ? readJson(ctx.applied) : null;
  atomicJson(ctx.pending, { home: ctx.normalized, appVersion: ctx.manifest.appVersion, before, after: pairHash(staged), backup, beforeApplied });
  try {
    if (!samePair(pairHash(ctx.files), before)) throw new Error('Update race before replacement');
    for (const name of ['exe', 'asar']) {
      if (fileHash(ctx.files[name]) !== before[name]) throw new Error(`Update race before ${name} replacement; refusing overwrite`);
      replaceFile(staged[name], ctx.files[name], before[name]);
      if (fileHash(ctx.files[name]) !== fileHash(staged[name])) throw new Error(`Replacement readback failed: ${name}`);
      console.log(`Replaced and verified ${name}`);
    }
    if (nextApplied === null) { if (existsSync(ctx.applied)) unlinkSync(ctx.applied); }
    else atomicJson(ctx.applied, nextApplied);
    if (!samePair(pairHash(ctx.files), pairHash(staged))) throw new Error('Final pair mismatch');
    unlinkSync(ctx.pending);
  } catch (error) {
    console.error(`Commit failed: ${error.message}; recovering from ${backupDir}`);
    try { recoverPending(ctx); } catch (recovery) { throw new Error(`${error.message}; RECOVERY FAILED: ${recovery.message}; pending retained at ${ctx.pending}`); }
    throw error;
  }
}

export function stageDirectory() {
  const root = join(REPO_ROOT, 'work'); mkdirSync(root, { recursive: true });
  return mkdtempSync(join(root, 'stage-'));
}
