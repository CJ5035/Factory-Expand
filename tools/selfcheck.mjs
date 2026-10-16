import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, existsSync, cpSync, copyFileSync, chmodSync, readdirSync, statSync, unlinkSync, mkdtempSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { spawnSync, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { parseDataDeclarations, extractEnglish } from './extract_en.mjs';
import { openAsar, closeAsar, readEntry } from '../scripts/lib/asar.mjs';
import { context, assertOriginal, pairHash, samePair, REPO_ROOT, fileHash, atomicJson, readJson } from '../scripts/lib/env.mjs';
import { loadPatchSet, applyEdits, buildReplacements } from '../scripts/lib/patch.mjs';
import { patchFuse, inspectFuse } from '../scripts/lib/fuses.mjs';
import { checkJavaScript } from '../scripts/lib/syntaxcheck.mjs';
import { validateText, validateTree, leafEntries } from './build_resource.mjs';

const home = 'C:/Users/11013/AppData/Local/Factory/app-0.200.0';
const asar = openAsar(`${home}/resources/app.asar`);
try {
  const data = parseDataDeclarations('const a="a\\n\\x62\\u4e2d",b={/*x*/text:a,list:[1,-2,!0,!1,true,false,null,`line\ntext`]},c=b;');
  assert.equal(data.get('c').text, 'a\nb中');
  assert.deepEqual(data.get('b').list, [1,-2,true,false,true,false,null,'line\ntext']);
  for (const source of ['const a=missing;', 'const a=b,b=a;', 'const a={x:1,x:2};', 'const a=fn();', 'const a=`${foo}`;', 'const a={...b};', 'const a=1+2;', 'const a={get x(){}};', 'const a="unterminated', 'const a=/regex/;', 'const a=1,a=2;']) {
    assert.throws(() => parseDataDeclarations(source), undefined, source);
  }
  const en = extractEnglish(readEntry(asar, '.vite/renderer/main_window/assets/index-CCcgJ39D.js').toString());
  const jaSource = readEntry(asar, '.vite/renderer/main_window/assets/resources-BauhWe4W.js').toString();
  const jaData = parseDataDeclarations(jaSource.slice(jaSource.indexOf('const t='), jaSource.indexOf(',sT=e(')) + ';');
  const jaRoot = jaSource.slice(jaSource.indexOf(',sT=e('));
  const ja = Object.fromEntries([...jaRoot.matchAll(/"\.\/([\w]+)\.json":([\w$]+)/g)].map(([,ns,name]) => [ns, jaData.get(name)]));
  ja.components = jaData.get('nT');
  const leaves = (item, path = '') => item && typeof item === 'object' ? Object.entries(item).flatMap(([key,value]) => leaves(value, path ? `${path}.${key}` : key)) : [[path, typeof item]];
  const enLeaves = new Map(leaves(en));
  const jaLeaves = new Map(leaves(ja));
  const onlyEn = [...enLeaves.keys()].filter(key => !jaLeaves.has(key));
  const onlyJa = [...jaLeaves.keys()].filter(key => !enLeaves.has(key));
  for (const [key, type] of jaLeaves) if (enLeaves.has(key)) assert.equal(enLeaves.get(key), type, key);
  assert.deepEqual(Object.keys(en).sort(), Object.keys(ja).sort());
  assert.equal(Object.keys(en).length, 19);
  console.log(`Extraction PASS: 19 namespaces; EN ${enLeaves.size}, JA ${jaLeaves.size}; common leaf types match.`);
  console.log('Official resource differences:', JSON.stringify({onlyEn:onlyEn.length,onlyJa:onlyJa.length,enExamples:onlyEn.slice(0,8),jaExamples:onlyJa.slice(0,8)}));
  console.log('Samples:', en.common.actions.contactUs, en.settings.appearanceSection.appearance, en.components.user.userProfile.openSettings);
  console.log('Parser PASS: strings/escapes/comments/arrays/literals/references and 11 rejection cases.');
  console.log('Non-singular English additions:', JSON.stringify(onlyEn.filter(key => !key.endsWith('_one'))));
  const ctx = context({home}); const set = loadPatchSet('0.200.0');
  assertOriginal(ctx.files, ctx, set.patches);
  const replacements = buildReplacements(asar, set);
  assert.equal(replacements.replace.size, 2);
  assert.equal(new Set(set.patches.targets.flatMap(target => target.edits.map(edit => edit.marker))).size, 3);
  for (const target of set.patches.targets) {
    const changed = replacements.replace.get(target.file).toString();
    const repeated = applyEdits(changed, target.edits, target.file);
    assert.equal(repeated.text, changed); assert.ok(repeated.report.every(edit => edit.status === 'already-applied'));
  }
  assert.equal(checkJavaScript(replacements.replace).failures.length, 0);
  const originalExe = readFileSync(ctx.files.exe);
  const changedExe = patchFuse(originalExe, ctx.manifest);
  assert.equal(inspectFuse(changedExe, ctx.manifest.fuse).enabled, false);
  let differences = 0; for (let i=0;i<originalExe.length;i++) if (originalExe[i] !== changedExe[i]) differences++;
  assert.equal(differences, 1);
  console.log('Patch PASS: three unique anchors/markers, repeated edits no-op, JS syntax and one-byte fuse patch.');
  for (const ns of ['common','settings','sessions','softwareFactory','inbox','onboarding','errors','components']) {
    for (const [key,text] of leafEntries(en[ns])) validateText(text,text,`${ns}.${key}`);
  }
  validateText('<a>{{name}}</a><b>Value</b>', '<b>值</b><a>{{name}}</a>');
  const invalidTexts = [
    ['{{name}} {{name}}','{{name}}'], ['{{name, number}}','{{name}}'],
    ['<a><b>text</b></a>','<b><a>文本</a></b>'], ['<a><b>text</b></a>','<a><b>文本</a></b>'],
    ['<name/>','<name></name>'], ['text',''], ['https://example.com/a','https://example.com/b'],
    ['Run `npm install`','运行 `npm update`'], ['{{name}}','{{name}} {{oops']
  ];
  for (const [source,translation] of invalidTexts) assert.throws(()=>validateText(source,translation));
  for (const translation of [{unknown:'值'},{text:null},{text:1}]) assert.throws(()=>validateTree({text:'text'},translation));
  console.log('Resource validator PASS: all source strings accepted; sibling tag reorder accepted; 12 invalid translation cases rejected.');
} finally { closeAsar(asar); }

if (process.argv.includes('--exercise')) {
  // All installed-file writes below are confined to this new full version copy.
  const exercise = mkdtempSync(join(REPO_ROOT, 'work', 'exercise-'));
  const copyHome = join(exercise, 'app-0.200.0');
  const real = context({home});
  const realPair = pairHash(real.files);
  const results = [];
  const snapshot = (dir) => !existsSync(dir) ? null : readdirSync(dir,{recursive:true}).sort().map(name => {
    const file = join(dir,name), info = statSync(file);
    return info.isFile() ? [name,info.size,info.mtimeMs,fileHash(file)] : [name,'directory'];
  });
  const realState = snapshot(real.state);
  const sourceFile = join(REPO_ROOT,'translations/zh-CN/common.json');
  const sourceBefore = readFileSync(sourceFile);
  const buildFile = join(REPO_ROOT,'translations/build/resources-zh-CN.js');
  const coverageFile = join(REPO_ROOT,'translations/build/coverage.json');
  const buildBefore = readFileSync(buildFile), coverageBefore = readFileSync(coverageFile);
  const pass = (name) => { results.push(name); console.log(`Exercise PASS: ${name}`); writeFileSync(join(exercise,'results.json'),JSON.stringify({results},null,2)); };
  const run = (operation, flags = [], expected = 0) => {
    const result = spawnSync(process.execPath,[join(REPO_ROOT,'scripts',`${operation}.mjs`),`--home=${copyHome}`,...flags],{cwd:REPO_ROOT,encoding:'utf8',windowsHide:true,timeout:180000});
    const output = (result.stdout ?? '') + (result.stderr ?? '');
    if (result.status !== expected) throw new Error(`${operation} ${flags} returned ${result.status}, expected ${expected}: ${output}`);
    return output;
  };
  const build = () => {
    const result = spawnSync(process.execPath,[join(REPO_ROOT,'tools/build_resource.mjs')],{cwd:REPO_ROOT,encoding:'utf8',windowsHide:true});
    assert.equal(result.status,0,result.stderr);
  };
  let ctx;
  try {
    cpSync(home,copyHome,{recursive:true,errorOnExist:true,force:false});
    ctx = context({home:copyHome});
    assert.ok(ctx.normalized.startsWith(join(REPO_ROOT,'work').toLowerCase()+'\\'));
    assert.notEqual(ctx.state,real.state);
    assert.deepEqual(pairHash(ctx.files),realPair);
    assert.equal(fileHash(join(`${ctx.files.asar}.unpacked`,'node_modules/keytar/build/Release/keytar.node')),ctx.manifest.unpacked['node_modules/keytar/build/Release/keytar.node']);
    const cleanTree = snapshot(copyHome), pristineBefore = snapshot(ctx.pristine.dir), stateBefore = snapshot(ctx.state);
    assert.match(run('apply',['--dry-run']),/Dry-run PASS/);
    assert.deepEqual(snapshot(copyHome),cleanTree);
    assert.deepEqual(snapshot(ctx.pristine.dir),pristineBefore);
    assert.deepEqual(snapshot(ctx.state),stateBefore);
    assert.match(run('restore',['--check']),/Clean|Restored/);
    assert.match(run('verify',[],1),/Not applied/);
    pass('first dry-run leaves complete install/pristine/state unchanged; clean/not-applied states distinct');

    // Actual second-file failure: the archive is read-only; the exe replacement
    // must have happened before the failure, not merely a preflight refusal.
    chmodSync(ctx.files.asar,0o444);
    let failed;
    try { failed = run('apply',[],1); } finally { chmodSync(ctx.files.asar,0o666); }
    assert.match(failed,/Replaced and verified exe/);
    assert.doesNotMatch(failed,/Replaced and verified asar/);
    assert.match(failed,/Commit failed/);
    assert.match(failed,/Recovered operation-before pair/);
    assert.deepEqual(pairHash(ctx.files),realPair);
    assert.equal(existsSync(ctx.applied),false); assert.equal(existsSync(ctx.pending),false);
    pass('read-only second target fails after exe replacement; both files and absent applied record recovered');

    assert.match(run('apply'),/Applied Chinese localization/);
    const patched = pairHash(ctx.files), applied = readJson(ctx.applied);
    assert.ok(!samePair(patched,realPair));
    assert.match(run('verify'),/Applied/);
    const appliedTree = snapshot(copyHome), appliedState = snapshot(ctx.state), pristineTree = snapshot(ctx.pristine.dir);
    assert.match(run('apply'),/Already applied/);
    assert.deepEqual(snapshot(copyHome),appliedTree); assert.deepEqual(snapshot(ctx.state),appliedState); assert.deepEqual(snapshot(ctx.pristine.dir),pristineTree);
    const savedPatched = {exe:join(exercise,'patched.exe'),asar:join(exercise,'patched.asar')};
    for(const name of ['exe','asar']) copyFileSync(ctx.files[name],savedPatched[name]);
    pass('apply, verify and repeated apply preserve exact bytes and file mtimes on the second application');

    copyFileSync(ctx.pristine.exe,ctx.files.exe);
    assert.match(run('verify',[],1),/Partial application|hash mismatch/);
    run('restore');
    assert.deepEqual(pairHash(ctx.files),realPair); assert.match(run('restore',['--check']),/Restored/);
    pass('half-applied pair rejected; restore repairs the recorded partial pair and restores Valid signature/fuse');

    // The production pristine is shared by build, so corruption testing needs
    // a separate tool checkout with its own REPO_ROOT/pristine/state/backups.
    const authoritativePristine = snapshot(ctx.pristine.dir);
    const fixture = join(exercise,'tool-fixture'); mkdirSync(fixture);
    for(const dir of ['scripts','tools','patches','translations']) cpSync(join(REPO_ROOT,dir),join(fixture,dir),{recursive:true});
    copyFileSync(join(REPO_ROOT,'package.json'),join(fixture,'package.json'));
    const fixturePristine = join(fixture,relative(REPO_ROOT,ctx.pristine.dir));
    cpSync(ctx.pristine.dir,fixturePristine,{recursive:true});
    const fixtureAsar = join(fixturePristine,'app.asar'); chmodSync(fixtureAsar,0o666);
    const damagedPristine = readFileSync(fixtureAsar); damagedPristine[damagedPristine.length-1] ^= 1; writeFileSync(fixtureAsar,damagedPristine);
    const fixtureResult = spawnSync(process.execPath,[join(fixture,'scripts/apply.mjs'),`--home=${copyHome}`,'--dry-run'],{cwd:fixture,encoding:'utf8',windowsHide:true});
    assert.equal(fixtureResult.status,1); assert.match(fixtureResult.stdout+fixtureResult.stderr,/hash mismatch/);
    assert.deepEqual(snapshot(ctx.pristine.dir),authoritativePristine);
    const savedExe = readFileSync(ctx.files.exe);
    try {
      const damaged = Buffer.from(savedExe); damaged[damaged.length-1] ^= 1; writeFileSync(ctx.files.exe,damaged);
      assert.match(run('apply',['--dry-run'],1),/hash mismatch/);
    } finally { writeFileSync(ctx.files.exe,savedExe); }
    pass('corrupted pristine and unknown installed build both refused without registration/overwrite');

    // Exercise all three interruption windows in both transaction directions.
    for (const direction of ['apply','restore']) for (const phase of [1,2,3]) {
      const beforeFiles = direction === 'apply' ? ctx.pristine : savedPatched;
      const afterFiles = direction === 'apply' ? savedPatched : ctx.pristine;
      const beforeApplied = direction === 'apply' ? null : applied;
      const afterApplied = direction === 'apply' ? applied : null;
      for(const name of ['exe','asar']) {
        chmodSync(ctx.files[name],0o666);
        copyFileSync(beforeFiles[name],ctx.files[name]);
        chmodSync(ctx.files[name],0o666);
      }
      if(beforeApplied) atomicJson(ctx.applied,beforeApplied); else if(existsSync(ctx.applied)) unlinkSync(ctx.applied);
      const backupDir = join(REPO_ROOT,'backups',ctx.key,`simulated-${randomUUID()}`); mkdirSync(backupDir,{recursive:true});
      const backup = {exe:join(backupDir,'factory-desktop.exe'),asar:join(backupDir,'app.asar')};
      for(const name of ['exe','asar']) copyFileSync(beforeFiles[name],backup[name]);
      const pending = {home:ctx.normalized,appVersion:'0.200.0',before:pairHash(beforeFiles),after:pairHash(afterFiles),backup,beforeApplied};
      atomicJson(ctx.pending,pending);
      copyFileSync(afterFiles.exe,ctx.files.exe);
      chmodSync(ctx.files.exe,0o666);
      if(phase>=2) { copyFileSync(afterFiles.asar,ctx.files.asar); chmodSync(ctx.files.asar,0o666); }
      if(phase===3) { if(afterApplied) atomicJson(ctx.applied,afterApplied); else if(existsSync(ctx.applied)) unlinkSync(ctx.applied); }
      const pendingTree = snapshot(ctx.state), pendingPair = pairHash(ctx.files);
      for(const [op,flags] of [['verify',[]],['apply',['--dry-run']],['restore',['--check']]]) assert.match(run(op,flags,1),/Pending recovery required/);
      assert.deepEqual(snapshot(ctx.state),pendingTree); assert.deepEqual(pairHash(ctx.files),pendingPair);
      assert.match(run('restore',[],2),/Recovered operation-before pair/);
      assert.deepEqual(pairHash(ctx.files),pending.before);
      assert.deepEqual(existsSync(ctx.applied)?readJson(ctx.applied):null,beforeApplied);
      assert.equal(existsSync(ctx.pending),false);
      pass(`${direction} pending phase ${phase}: both files and prior applied metadata recovered; read-only commands did not recover`);
    }
    run('restore');
    assert.deepEqual(pairHash(ctx.files),realPair);

    run('apply');
    const translated = JSON.parse(sourceBefore); translated.actions.contactUs += '（自检）';
    writeFileSync(sourceFile,JSON.stringify(translated,null,2)+'\n'); build();
    assert.match(run('verify',[],1),/Translation source changed/);
    assert.match(run('apply',[],1),/Translation source changed/);
    run('restore'); build(); run('apply'); run('verify'); run('restore');
    writeFileSync(sourceFile,sourceBefore); build();
    assert.deepEqual(readFileSync(buildFile),buildBefore);
    assert.deepEqual(readFileSync(coverageFile),coverageBefore);
    pass('resource-byte change refused in-place; restore -> build -> apply update and final restoration succeed');

    // A live owner cannot be removed, even if the file claims an old identity.
    atomicJson(ctx.lock,{pid:process.pid,identity:'live-owner-test'});
    assert.match(run('restore',[],1),/alive|cannot be confirmed/);
    unlinkSync(ctx.lock);
    // Concurrent takeover of a confirmed-dead PID is serialized by the mutex.
    assert.throws(()=>process.kill(99999999,0));
    atomicJson(ctx.lock,{pid:99999999,identity:'confirmed-exited-test'});
    const concurrent = await Promise.all([0,1].map(()=>new Promise((resolveResult,reject)=>{
      const child = spawn(process.execPath,[join(REPO_ROOT,'scripts/restore.mjs'),`--home=${copyHome}`],{cwd:REPO_ROOT,windowsHide:true});
      let output=''; child.stdout.on('data',data=>output+=data);child.stderr.on('data',data=>output+=data);
      child.on('error',reject); child.on('close',code=>resolveResult({code,output}));
    })));
    assert.ok(concurrent.some(result=>result.code===0));
    assert.ok(concurrent.every(result=>result.code===0||(result.code===1&&/mutex/.test(result.output))));
    assert.equal(existsSync(ctx.lock),false); assert.equal(existsSync(ctx.pending),false);
    assert.deepEqual(pairHash(ctx.files),realPair);
    pass('live lock refused; simultaneous stale-lock takeover serialized without deleting another live lock');

    const wrapper = spawnSync('cmd.exe',['/d','/c','verify.cmd',`--home=${copyHome}`],{cwd:REPO_ROOT,encoding:'utf8',windowsHide:true});
    assert.equal(wrapper.status,1); assert.match(wrapper.stdout+wrapper.stderr,/Not applied/);
    assert.deepEqual(pairHash(real.files),realPair); assert.deepEqual(snapshot(real.state),realState);
    assert.notEqual(ctx.state,real.state); assert.notEqual(ctx.pending,real.pending);
    pass('cmd preserves nonzero exit; real installation/state isolated and unchanged throughout');
    console.log(`Full exercise PASS: ${results.length} scenarios; artifacts ${exercise}`);
  } catch(error) {
    writeFileSync(join(exercise,'results.json'),JSON.stringify({results,error:error.stack},null,2));
    throw error;
  } finally {
    writeFileSync(sourceFile,sourceBefore); writeFileSync(buildFile,buildBefore); writeFileSync(coverageFile,coverageBefore);
    if(ctx) chmodSync(ctx.files.asar,0o666);
    assert.deepEqual(pairHash(real.files),realPair,'Real installed pair must remain unchanged');
  }
}
