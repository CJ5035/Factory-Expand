import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, existsSync, cpSync, rmSync, chmodSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseDataDeclarations, extractEnglish } from './extract_en.mjs';
import { openAsar, closeAsar, readEntry } from '../scripts/lib/asar.mjs';
import { context, assertOriginal, pairHash, samePair } from '../scripts/lib/env.mjs';
import { loadPatchSet, applyEdits, buildReplacements } from '../scripts/lib/patch.mjs';
import { patchFuse, inspectFuse } from '../scripts/lib/fuses.mjs';
import { checkJavaScript } from '../scripts/lib/syntaxcheck.mjs';

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
} finally { closeAsar(asar); }
