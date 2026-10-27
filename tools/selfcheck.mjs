import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, existsSync, cpSync, copyFileSync, chmodSync, readdirSync, statSync, unlinkSync, mkdtempSync } from 'node:fs';
import { resolve, join, relative, dirname } from 'node:path';
import { spawnSync, spawn, execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { parseDataDeclarations, extractEnglish, extractDesktopEnglish } from './extract_en.mjs';
import { openAsar, closeAsar, readEntry } from '../scripts/lib/asar.mjs';
import { context, assertOriginal, checkedPristine, pairHash, samePair, REPO_ROOT, fileHash, atomicJson, readJson } from '../scripts/lib/env.mjs';
import { loadPatchSet, applyEdits, buildReplacements, loadAddedFiles } from '../scripts/lib/patch.mjs';
import { patchFuse, inspectFuse } from '../scripts/lib/fuses.mjs';
import { checkJavaScript } from '../scripts/lib/syntaxcheck.mjs';
import { validateText, validateTree, validateTerminology, measureCoverage, leafEntries } from './build_resource.mjs';
import projectRemarksRuntime from '../scripts/runtime/factory-project-remarks.cjs';

const remarksTests = spawnSync(process.execPath, ['--test', join(REPO_ROOT, 'tools/project-remarks.test.mjs')],
  { cwd: REPO_ROOT, encoding: 'utf8', windowsHide: true });
assert.equal(remarksTests.status, 0, remarksTests.stdout + remarksTests.stderr);
console.log('Project remarks runtime PASS: 8 isolated storage/IPC/client/component tests.');

const home = 'C:/Users/11013/AppData/Local/Factory/app-0.207.0';
const baselineCtx = context({home}), baselineSet = loadPatchSet('0.207.0');
const baseline = checkedPristine(baselineCtx, baselineSet.patches) ?? baselineCtx.files;
const asar = openAsar(baseline.asar);
try {
  const data = parseDataDeclarations('const a="a\\n\\x62\\u4e2d",b={/*x*/text:a,list:[1,-2,!0,!1,true,false,null,`line\ntext`]},c=b;');
  assert.equal(data.get('c').text, 'a\nb中');
  assert.deepEqual(data.get('b').list, [1,-2,true,false,true,false,null,'line\ntext']);
  for (const source of ['const a=missing;', 'const a=b,b=a;', 'const a={x:1,x:2};', 'const a=fn();', 'const a=`${foo}`;', 'const a={...b};', 'const a=1+2;', 'const a={get x(){}};', 'const a="unterminated', 'const a=/regex/;', 'const a=1,a=2;']) {
    assert.throws(() => parseDataDeclarations(source), undefined, source);
  }
  const rendererSource = readEntry(asar, '.vite/renderer/main_window/assets/index-XMuN1FQ2.js').toString();
  const en = extractEnglish(rendererSource,'0.207.0');
  for(const [ns,tree]of Object.entries(en)) assert.deepEqual(tree,readJson(join(REPO_ROOT,'translations/en',`${ns}.json`)),`Extracted English source ${ns}`);
  const jaSource = readEntry(asar, '.vite/renderer/main_window/assets/resources-DO9DETlz.js').toString();
  const jaData = parseDataDeclarations(jaSource.slice(jaSource.indexOf('const t='), jaSource.indexOf(',wT=e(')) + ';');
  const jaRoot = jaSource.slice(jaSource.indexOf(',wT=e('));
  const ja = Object.fromEntries([...jaRoot.matchAll(/"\.\/([\w]+)\.json":([\w$]+)/g)].map(([,ns,name]) => [ns, jaData.get(name)]));
  ja.components = jaData.get('CT');
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
  const ctx = context({home}); const set = loadPatchSet('0.207.0');
  assert.equal(set.patches.targets.length, 3, 'Project remarks add the pinned preload target');
  assertOriginal(baseline, ctx, set.patches);
  const desktop = extractDesktopEnglish(readEntry(asar,'.vite/build/initLifecycle-BsdiUb2Z.js').toString(),'0.207.0');
  assert.equal(leafEntries(desktop).length,ctx.manifest.resourceSources.desktop.leaves);
  assert.deepEqual(desktop,readJson(join(REPO_ROOT,'translations/en/desktop.json')));
  const replacements = buildReplacements(asar, set);
  assert.equal(replacements.replace.size, 3);
  assert.deepEqual(ctx.manifest.patchShape, { targets: 3, edits: 51, addFiles: 4 });
  assert.equal(new Set(set.patches.targets.flatMap(target => target.edits.map(edit => edit.marker))).size, ctx.manifest.patchShape.edits);
  for (const target of set.patches.targets) {
    const changed = replacements.replace.get(target.file).toString();
    const repeated = applyEdits(changed, target.edits, target.file);
    assert.equal(repeated.text, changed); assert.ok(repeated.report.every(edit => edit.status === 'already-applied'));
  }
  assert.equal(checkJavaScript(new Map([...replacements.replace, ...loadAddedFiles(set)])).failures.length, 0);
  const originalExe = readFileSync(baseline.exe);
  const changedExe = patchFuse(originalExe, ctx.manifest);
  assert.equal(inspectFuse(changedExe, ctx.manifest.fuse).enabled, false);
  let differences = 0; for (let i=0;i<originalExe.length;i++) if (originalExe[i] !== changedExe[i]) differences++;
  assert.equal(differences, 1);
  console.log(`Patch PASS: ${ctx.manifest.patchShape.edits} unique anchors/markers, repeated edits no-op, JS syntax and one-byte fuse patch.`);
  const rendererTarget = set.patches.targets.find(target =>
    target.file.endsWith('/index-XMuN1FQ2.js'));
  const groupEdit = rendererTarget.edits.find(edit =>
    edit.find === 'return c.jsx(L9t,{branchLabel:bi.branchLabel');
  assert.ok(groupEdit);
  const chooseGroup = runInNewContext(
    '(function(Xl,bi,c,L9t,FactoryRemarkGroup,Pw){' +
    groupEdit.replace + '},bi.key)})');
  const nativeGroup = {}, remarkGroup = {}, unknown = { Unknown: 'unknown' };
  const jsx = { jsx: (type, props, key) => ({ type, props, key }) };
  const group = { key: 'C:/a/app', branchLabel: 'main' };
  const valid = chooseGroup({ kind: 'directory' }, group, jsx, nativeGroup, remarkGroup, unknown);
  assert.equal(valid.type, remarkGroup);
  assert.equal(valid.props.factoryProjectKey, group.key);
  assert.equal(valid.key, group.key);
  for (const excluded of [undefined, { kind: 'unknown' }]) {
    const result = chooseGroup(excluded, group, jsx, nativeGroup, remarkGroup, unknown);
    assert.equal(result.type, nativeGroup);
    assert.equal(result.props.factoryProjectKey, undefined);
  }

  const nativeEdit = set.patches.targets.find(target=>target.file.endsWith('/initLifecycle-BsdiUb2Z.js')).edits.find(edit=>edit.find.startsWith("function rf(){"));
  assert.ok(rendererSource.includes('Xl=Ee===a1.Project?Sl:void 0'));
  assert.ok(rendererSource.includes('we=_===a1.UpdatedAt&&Ce.length>0'));
  const projectKeySource = rendererSource.slice(rendererSource.indexOf('function lqe('), rendererSource.indexOf('function H1c('));
  const keyOf = runInNewContext(projectKeySource + ';lqe', { a1: { Computer: 'computer' }, jt: { Local: 'local' } });
  const localKey = keyOf({ computerType: 'local', projectKey: 'C:/a/app' }, 'project');
  assert.equal(localKey, 'C:/a/app');
  assert.notEqual(localKey, keyOf({ computerType: 'local', projectKey: 'C:/b/app' }, 'project'));
  assert.notEqual(keyOf({ computerKey: 'machine:a', projectKey: '/app' }, 'project'), keyOf({ computerKey: 'machine:b', projectKey: '/app' }, 'project'));
  assert.equal(keyOf({ computerType: 'local', projectKey: 'worktree:C:/app/tree' }, 'project'), 'worktree:C:/app/tree');
  const bridgeEdit = set.patches.targets.find(target=>target.file.endsWith('/preload.js')).edits[0];
  const bridgeCalls = [], bridgeListeners = new Map();
  const ipcRenderer = {
    invoke: (channel, payload) => { bridgeCalls.push({ channel, payload }); return Promise.resolve(); },
    on: (channel, listener) => bridgeListeners.set(channel, listener),
    removeListener: (channel, listener) => { assert.equal(bridgeListeners.get(channel), listener); bridgeListeners.delete(channel); }
  };
  const remarksBridge = runInNewContext('({' + bridgeEdit.replace.slice(0,-bridgeEdit.find.length) + '})', { M: { ipcRenderer } }).projectRemarks;
  await remarksBridge.get();
  const input = { key: 'C:/app', remark: '备注' };
  await remarksBridge.set(input);
  assert.deepEqual(bridgeCalls, [{channel:'factory-expand:projectRemarks:get',payload:undefined},{channel:'factory-expand:projectRemarks:set',payload:input}]);
  let received;
  const unsubscribe = remarksBridge.onChanged(payload => { received = payload; });
  const payload = { revision: 1, projectRemarks: {} };
  bridgeListeners.get('factory-expand:projectRemarks:changed')({sender:'must not leak'}, payload);
  assert.equal(received, payload); unsubscribe(); assert.equal(bridgeListeners.size, 0);
  console.log('Project remarks patch PASS: actual group projection, native identities, excluded groups and limited preload IPC.');
  assert.ok(nativeEdit,'Native default role labels must be localized');
  const nativeZh=readJson(join(REPO_ROOT,'translations/patch-ui.zh-CN.json'));
  const nativeMapStart=nativeEdit.replace.indexOf('const t=');
  const nativeMapEnd=nativeEdit.replace.indexOf(';for(',nativeMapStart);
  const nativeRoles=parseDataDeclarations(nativeEdit.replace.slice(nativeMapStart,nativeMapEnd)+';').get('t');
  assert.deepEqual([...new Set(Object.values(nativeRoles))].sort(),[...ctx.manifest.desktopSupplementKeys].sort());
  const nativeBuilt=readJson(join(REPO_ROOT,'translations/build/0.207.0/desktop-zh-CN.json'));
  const nativeSource=readJson(join(REPO_ROOT,'translations/zh-CN/desktop.json'));
  for(const [key,value]of Object.entries(nativeSource))assert.deepEqual(nativeBuilt[key],value,`Native original group ${key}`);
  for(const key of ctx.manifest.desktopSupplementKeys)assert.equal(nativeBuilt[key],nativeZh[key],`Native supplemental label ${key}`);
  assert.equal(leafEntries(nativeBuilt).length,ctx.manifest.resourceSources.desktop.leaves+ctx.manifest.desktopSupplementKeys.length);
  let nativeLocale='en';
  const nativeMenu=runInNewContext(nativeEdit.replace.slice(0,nativeEdit.replace.indexOf('function rf(){'))+';FactoryNativeMenu',{
    cc:{get language(){return nativeLocale;}},te:(key,options)=>nativeZh[key]??options.defaultValue
  },{timeout:1000});
  const nativeCallback=()=>{};
  const menuFixture={items:[{id:'Edit',role:'editMenu',label:'Edit',submenu:{items:[{role:'undo',label:'&Undo',enabled:false,accelerator:'Ctrl+Z',click:nativeCallback},{role:'copy',label:'Copy custom content',enabled:true},{role:'copy',label:'Copy',enabled:true}]}},{role:'quit',label:'Exit'},{label:'Unknown dynamic label'}]};
  const nativeBefore=JSON.stringify(menuFixture);
  assert.equal(nativeMenu(menuFixture),menuFixture);assert.equal(JSON.stringify(menuFixture),nativeBefore,'Other locales must stay unchanged');
  nativeLocale='zh-CN';nativeMenu(menuFixture);
  assert.equal(menuFixture.items[0].label,'编辑');
  assert.equal(menuFixture.items[0].submenu.items[0].label,'撤销');
  assert.equal(menuFixture.items[0].submenu.items[0].enabled,false);
  assert.equal(menuFixture.items[0].submenu.items[0].accelerator,'Ctrl+Z');
  assert.equal(menuFixture.items[0].submenu.items[0].click,nativeCallback);
  assert.equal(menuFixture.items[0].submenu.items[1].label,'Copy custom content');
  assert.equal(menuFixture.items[0].submenu.items[2].label,'复制');
  assert.equal(menuFixture.items[1].label,'退出');assert.equal(menuFixture.items[2].label,'Unknown dynamic label');
  console.log('Native menus PASS: known generated role labels translate recursively only in Chinese; custom labels, role IDs, callbacks, enabled flags and accelerators stay unchanged.');
  const rendererEdits = set.patches.targets.find(target => target.file.endsWith('/index-XMuN1FQ2.js')).edits;
  for (const [version, ref, layoutEffect, localeInstance, treeName, coreEndMarker, hooksStartMarker, hooksEndMarker, renderRoot, createVNode] of [
    ['0.200.0', 'Ou', 'h4', 'Rin'], ['0.201.0', 'Fu', 'u4', 'eon', 'Jgn', 'const yXs=', 'var Oae,', 'function XXs(', '_Ct', 'xCt'],
    ['0.202.0', 'Hu', 'S4', 'yrn', 'h0n', 'const $nr=', 'var rle,', 'function Sir(', 'a3t', 's3t'],
    ['0.204.0', 'Vu', 'k4', 'ccn', 'tvn', 'const flr=', 'var ece,', 'function Wlr(', 'lxt', 'rxt'],
    ['0.205.0', 'sf', 'X4', 'Zdn', 'q2n', 'const Eur=', 'var Cce,', 'function rfr(', 'bEt', 'yEt'],
    ['0.207.0', 'wf', 'oT', 'Zmn', 'JIn', 'const vbr=', 'var Zue,', 'function Zbr(', 'ekt', 'XTt']
  ]) {
    const treeEdit = loadPatchSet(version).patches.targets[0].edits.find(edit =>
      edit.find.startsWith(`}){"use no memo";const y=${ref}(null)`));
    assert.ok(treeEdit, `File tree patch ${version}`);
    const prefixEnd = treeEdit.replace.indexOf(`const y=${ref}(null)`);
    assert.ok(prefixEnd > 3, `File tree entry ${version}`);
    const effects = [], listeners = new Set();
    let renders = 0, state = 0;
    const i18n = {
      on: (event, listener) => { assert.equal(event, 'languageChanged'); listeners.add(listener); },
      off: (event, listener) => { assert.equal(event, 'languageChanged'); listeners.delete(listener); }
    };
    const enterTree = runInNewContext(`(function(){${treeEdit.replace.slice(3, prefixEnd)}})`, {
      le: () => { throw new Error(`React Hook called inside Preact tree ${version}`); },
      [layoutEffect]: effect => effects.push(effect), [localeInstance]: () => i18n,
      [version==='0.207.0'?'oe':version==='0.205.0'?'oe':version==='0.204.0'?'ie':'ne']: update => { state = update(state); renders++; }
    }, {timeout:1000});
    enterTree(); enterTree();
    assert.equal(effects.length, 2);
    const firstCleanup = effects[0](), secondCleanup = effects[1]();
    assert.equal(listeners.size, 2, 'Instances must own different listeners');
    for (const listener of listeners) listener('zh-CN');
    assert.equal(renders, 2); assert.equal(state, 2);
    firstCleanup(); assert.equal(listeners.size, 1);
    for (const listener of listeners) listener('en');
    assert.equal(renders, 3);
    secondCleanup(); assert.equal(listeners.size, 0);
    for (const listener of listeners) listener('zh-CN');
    assert.equal(renders, 3, 'Unmounted listeners must not update state');
    enterTree();
    const remountCleanup = effects[2]();
    assert.equal(listeners.size, 1);
    remountCleanup(); assert.equal(listeners.size, 0);

    if (version === '0.201.0' || version === '0.202.0' || version === '0.204.0' || version === '0.205.0' || version === '0.207.0') {
      let treeSource=rendererSource;
      if(version !== ctx.manifest.appVersion){
        const legacySet=loadPatchSet(version),m=legacySet.manifest;
        const legacyFile=join(REPO_ROOT,'pristine',version,m.original.exe+'-'+m.original.asar,'app.asar');
        assert.equal(fileHash(legacyFile),m.original.asar);
        const legacyArchive=openAsar(legacyFile);try{treeSource=readEntry(legacyArchive,legacySet.patches.targets[0].file).toString();}finally{closeAsar(legacyArchive);}
      }
      const patchedTreeSource = applyEdits(treeSource, [treeEdit], 'file-tree lifecycle').text;
      const coreStart = treeSource.indexOf(version==='0.207.0'?'var s0,':version==='0.205.0'?'var j1,':version==='0.204.0'?'var C1,':'var m1,');
      const coreEnd = treeSource.indexOf(coreEndMarker, coreStart);
      const hooksStart = treeSource.indexOf(hooksStartMarker);
      const hooksEnd = treeSource.indexOf(hooksEndMarker, hooksStart);
      const treeStart = patchedTreeSource.indexOf('function '+treeName+'(');
      const treeEndMarker=version==='0.207.0'?'we.current=me;':version==='0.205.0'?'xe.current=be;':version==='0.204.0'?'Ie.current=Ce;':'we.current=Se;';
      const treeEnd = patchedTreeSource.indexOf(treeEndMarker, treeStart);
      assert.ok(coreStart >= 0 && coreEnd > coreStart);
      assert.ok(hooksStart >= 0 && hooksEnd > hooksStart);
      assert.ok(treeStart >= 0 && treeEnd > treeStart);
      const pending = [];
      const lifecycle = runInNewContext(
        treeSource.slice(coreStart, coreEnd) + treeSource.slice(hooksStart, hooksEnd) +
        patchedTreeSource.slice(treeStart, treeEnd + treeEndMarker.length) +
        `renders++;return null}
         ${version==='0.207.0'?'s0':version==='0.205.0'?'j1':version==='0.204.0'?'C1':'m1'}.debounceRendering=fn=>pending.push(fn);
         const root={nodeType:1,namespaceURI:'http://www.w3.org/1999/xhtml',
           childNodes:[],firstChild:null,ownerDocument:document};
         const mount=()=>${renderRoot}(${createVNode}(${treeName},{controller:{},itemHeight:20}),root);
         mount();
         ({get renders(){return renders},mount,unmount:()=>${renderRoot}(null,root)})`,
        {document:{},setTimeout,clearTimeout,renders:0,pending,
          [localeInstance]:()=>i18n,le:()=>{throw new Error('React Hook called inside Preact tree');},ce:()=>{throw new Error('React Hook called inside Preact tree');}},
        {timeout:1000});
      assert.equal(lifecycle.renders, 1); assert.equal(listeners.size, 1);
      for (const language of ['zh-CN', 'en']) {
        for (const listener of listeners) listener(language);
        while (pending.length) pending.shift()();
      }
      assert.equal(lifecycle.renders, 3); assert.equal(listeners.size, 1);
      lifecycle.unmount(); assert.equal(listeners.size, 0);
      for (const listener of listeners) listener('zh-CN');
      assert.equal(pending.length, 0);
      lifecycle.mount(); assert.equal(lifecycle.renders, 4); assert.equal(listeners.size, 1);
      lifecycle.unmount(); assert.equal(listeners.size, 0);
    }
  }
  console.log('File tree PASS: all six versions use native Preact subscriptions; independent listeners, language updates, cleanup and remount; actual 0.201.0/0.202.0/0.204.0/0.205.0/0.207.0 renderer/hooks validate late setter initialization.');
  const countryEdit = rendererEdits.find(edit=>edit.find.startsWith("let he,Se;e[101]===Symbol.for(\"react.memo_cache_sentinel\")?(he=Old.filter(HFu).m"));
  const rangeEdit = rendererEdits.find(edit=>edit.find.startsWith("let Ct;t[161]===Symbol.for(\"react.memo_cache_sentinel\")?(Ct=vMd.map(YMd),t[161]="));
  const tabsEdit = rendererEdits.find(edit=>edit.find.startsWith("let Wo;e[189]!==Dt||e[190]!==$||e[191]!==gt||e[192]!==ze?(Wo=$&&!ze?{value:Dt,on"));
  const textEdit = rendererEdits.find(edit=>edit.find.startsWith("function Zmn(){"));
  assert.ok(countryEdit && rangeEdit && tabsEdit && textEdit, 'Required display patches must be present');
  let displayLocale = 'en';
  let billingForm = {country:'CN',taxIdType:'old',taxId:'saved-tax-id',name:'Unchanged'};
  const countryOptions = [{label:'China',value:'CN'},{label:'United States',value:'US'}];
  const countriesStart=rendererSource.indexOf('const Old=['),countriesEnd=rendererSource.indexOf(']',countriesStart)+1;
  assert.ok(countriesStart>=0&&countriesEnd>countriesStart);
  const actualCountries=parseDataDeclarations(rendererSource.slice(countriesStart,countriesEnd)+';').get('Old');
  const regionNames=new Intl.DisplayNames('zh-CN',{type:'region'});
  for(const country of actualCountries.filter(country=>country.value!=='')) {
    assert.match(country.value,/^[A-Z]{2}$/);
    assert.match(regionNames.of(country.value),/[\u3400-\u9fff]/,`Chinese country display ${country.value}`);
  }
  const renderCountries = runInNewContext(`(function(){${countryEdit.replace}return {options:he,onChange:Se}})`, {
    Intl, Zmn:()=>({language:displayLocale}), Old:countryOptions,
    HFu:()=>true,
    e:Array(103).fill(Symbol.for('react.memo_cache_sentinel')),
    fwt:new Set(['CN']), dxt:country=>`${country}-tax`, g:update=>{billingForm=update(billingForm);}
  }, {timeout:1000});
  const englishCountries = renderCountries();
  assert.deepEqual(Array.from(englishCountries.options, option=>option.label), ['China','United States']);
  displayLocale = 'zh-CN';
  const chineseCountries = renderCountries();
  assert.deepEqual(Array.from(chineseCountries.options, option=>option.label), ['中国','美国']);
  assert.deepEqual(Array.from(chineseCountries.options, option=>option.value), ['CN','US']);
  chineseCountries.onChange('CN');
  assert.deepEqual({...billingForm}, {country:'CN',taxIdType:'CN-tax',taxId:'saved-tax-id',name:'Unchanged'});
  chineseCountries.onChange('US');
  assert.deepEqual({...billingForm}, {country:'US',taxIdType:'',taxId:'',name:'Unchanged'});
  assert.deepEqual(countryOptions, [{label:'China',value:'CN'},{label:'United States',value:'US'}]);
  let selectedRange;
  const rangeChange = value=>{selectedRange=value;};
  const renderRanges = runInNewContext(`(function(){${rangeEdit.replace}return {options:Ct,control:At}})`, {
    Intl, Zmn:()=>({language:displayLocale}), vMd:['7d','30d','90d'].map(value=>({value,label:value})),
    c:{jsx:(type,props,key)=>({type,props,key})}, eI:'option', st:'container', Cw:'select',
    t:Array(164).fill(Symbol.for('react.memo_cache_sentinel')), r:'30d', lt:rangeChange
  }, {timeout:1000});
  displayLocale = 'en';
  assert.deepEqual(Array.from(renderRanges().options, option=>option.props.children), ['7 days','30 days','90 days']);
  displayLocale = 'zh-CN';
  const chineseRanges = renderRanges();
  assert.deepEqual(Array.from(chineseRanges.options, option=>option.props.children), ['7天','30天','90天']);
  assert.deepEqual(Array.from(chineseRanges.options, option=>option.props.value), ['7d','30d','90d']);
  const rangeControl = chineseRanges.control.props.children.props;
  assert.equal(rangeControl.value,'30d'); assert.equal(rangeControl.onValueChange,rangeChange);
  rangeControl.onValueChange('90d'); assert.equal(selectedRange,'90d');
  const patchUiEn = readJson(join(REPO_ROOT,'translations/patch-ui.en.json'));
  const patchUiZh = readJson(join(REPO_ROOT,'translations/patch-ui.zh-CN.json'));
  assert.equal(leafEntries(patchUiEn).length,ctx.manifest.uiSupplement.leaves);
  const translationCalls = [];
  const textRuntime = runInNewContext(textEdit.replace.slice(0,textEdit.replace.indexOf('function Zmn(){'))+';FactoryZhText', {
    Zmn:()=>({t:(key,options)=>{
      translationCalls.push({key,options});
      assert.equal(options.ns,'patchUi'); assert.equal(options.keySeparator,false); assert.equal(options.nsSeparator,false);
      assert.equal(options.defaultValue,key);
      const text = (displayLocale === 'zh-CN' ? patchUiZh[key] : patchUiEn[key]) ?? options.defaultValue;
      return text.replace(/{{(\w+)}}/g, (match,name)=>options[name] ?? match);
    }})
  }, {timeout:1000});
  assert.equal(textRuntime('Unknown display text'),'Unknown display text');
  const callsBeforeUndefined = translationCalls.length;
  assert.equal(textRuntime(undefined),undefined);
  assert.equal(translationCalls.length,callsBeforeUndefined,'Undefined must not reach the translator');
  const skillFilterEdit = rendererEdits.find(edit=>edit.find.startsWith("function T8r(t){return c.jsxs(m8r,{$active:t.active,\"aria-pressed\":t.active,disa"));
  const skillFilterCacheEdit = rendererEdits.find(edit=>edit.find.startsWith("let z;e[45]!==$||e[46]!==j.length?(z=j.length?c.jsx(KEn,{children:c.jsx(G,{gap:w"));
  assert.ok(skillFilterEdit&&skillFilterCacheEdit);
  assert.ok(skillFilterCacheEdit.replace.startsWith('const z=j.length?'));
  const filterView=runInNewContext(skillFilterEdit.replace+';T8r',{FactoryZhText:textRuntime,m8r:'button',c:{jsxs:(type,props,key)=>({type,props,key})}});
  const filterClick=()=>{},filterDto=Object.freeze({name:'All',label:undefined,matching:[1,2],active:true,disabled:false,onClick:filterClick});
  for(const locale of ['en','zh-CN','en','zh-CN']){
    displayLocale=locale;const view=filterView(filterDto);
    assert.equal(view.props.children[0],locale==='zh-CN'?patchUiZh.All:'All');
    assert.equal(view.key,'All');assert.equal(view.props.onClick,filterClick);assert.equal(view.props['aria-pressed'],true);assert.equal(view.props.disabled,false);
    assert.equal(filterView({...filterDto,label:'All'}).props.children[0],'All','User category named All remains unchanged');
  }
  const pathKey = Object.keys(patchUiEn).find(key=>key.includes('{{path}}'));
  assert.ok(pathKey, 'Supplement must include a real path interpolation display string');
  assert.equal(textRuntime(pathKey,{path:'C:/项目/a.b'}),patchUiZh[pathKey].replaceAll('{{path}}','C:/项目/a.b'));
  assert.ok(!textRuntime(pathKey,{path:'C:/项目/a.b'}).includes('{{path}}'));
  let selectedTab;
  const tabChange = value=>{selectedTab=value;};
  const renderTabs = runInNewContext(`(function(){${tabsEdit.replace}return Wo})`, {
    FactoryZhText:textRuntime, dg:{Overview:'overview-value',Chain:'chain-value'}, Dt:'chain-value', $:true, ze:false, gt:tabChange,
    e:Array(193).fill(Symbol.for('react.memo_cache_sentinel'))
  }, {timeout:1000});
  displayLocale = 'en';
  assert.deepEqual(Array.from(renderTabs().items, item=>item.label), ['Overview','Chain']);
  displayLocale = 'zh-CN';
  const chineseTabs = renderTabs();
  assert.deepEqual(Array.from(chineseTabs.items, item=>item.label), [patchUiZh.Overview,patchUiZh.Chain]);
  assert.ok(chineseTabs.items.every(item=>/[\u4e00-\u9fff]/.test(item.label)));
  assert.deepEqual(Array.from(chineseTabs.items, item=>item.value), ['overview-value','chain-value']);
  assert.equal(chineseTabs.value,'chain-value'); assert.equal(chineseTabs.onChange,tabChange);
  chineseTabs.onChange(chineseTabs.items[0].value); assert.equal(selectedTab,'overview-value');
  const catalogEdit = rendererEdits.find(edit=>edit.find.startsWith("di=Lt?Qd.Failed:Fiu({receipt:ni,isApplying:Qt});At.push({id:Mt,operationId:Wt.op"));
  assert.ok(catalogEdit, 'Catalog display projection patch must be present');
  const projectCatalog = runInNewContext(`(function(Bt,dn,sn){let di;const At=[];${catalogEdit.replace}status:di});return At[0]})`, {
    FactoryZhText:textRuntime, Lt:false, Qd:{Failed:'failed'}, Fiu:()=> 'ready', ni:{}, Qt:false,
    Mt:'setting-id', Wt:{operationId:'fixture.operation'}, en:{},
    $z:'current-model-sentinel', ZZ:'default-model-sentinel', kce:'inherit-model-sentinel', fR:'org-model-sentinel',
    s:(key,{name}={})=>`${key}:${name ?? ''}`
  }, {timeout:1000});
  const switchCatalog = {
    catalogItem:{operationId:'personal.notifications.set',section:'Notifications',label:'On'},
    control:{kind:'switch'}, formatValue:value=>value?'On':'Off'
  };
  const switchProjection = projectCatalog(switchCatalog,{beforeValue:false,before:'Off'},true);
  assert.equal(switchProjection.before,patchUiZh.Off); assert.equal(switchProjection.after,patchUiZh.On);
  assert.ok(/[\u4e00-\u9fff]/.test(switchProjection.before+switchProjection.after));
  const selectCatalog = {
    catalogItem:{operationId:'sessionDefaults.reasoning.set',section:'General',label:'Default reasoning level'},
    control:{kind:'select',options:[{value:'low-value',label:'Low'},{value:'high-value',label:'High'}]},
    formatValue:value=>`formatted:${value}`
  };
  const enumBefore = {beforeValue:'low-value',before:'Low'};
  const enumProjection = projectCatalog(selectCatalog,enumBefore,'high-value');
  assert.equal(enumProjection.before,patchUiZh.Low); assert.equal(enumProjection.after,patchUiZh.High);
  assert.equal(enumBefore.beforeValue,'low-value');
  assert.deepEqual(selectCatalog.control.options.map(option=>option.value),['low-value','high-value']);
  const instructionsCatalog = {
    catalogItem:{operationId:'delegation.customInstructions.set',section:'Delegations',label:'Your custom instructions'},
    control:{kind:'text'}, formatValue:value=>value
  };
  for(const userText of ['Project','On','C:/Project/自定义/On','\\\\server\\Project\\a.b']) {
    const projection = projectCatalog(instructionsCatalog,{beforeValue:userText,before:userText},userText);
    assert.equal(projection.before,userText); assert.equal(projection.after,userText);
    assert.equal(projection.label,patchUiZh['Your custom instructions']);
  }
  const modelCatalog = {
    catalogItem:{operationId:'sessionDefaults.model.set',section:'General',label:'Default model'},
    control:{kind:'select',options:[{value:'model-id',label:'High'}]}, formatValue:value=>`formatted:${value}`
  };
  const highModelProjection = projectCatalog(modelCatalog,{beforeValue:'model-id',before:'High'},'model-id');
  assert.equal(highModelProjection.before,'High');
  assert.equal(highModelProjection.after,'High', 'A dynamic model whose name matches a translated enum must keep its name');
  const modelSnapshot = {beforeValue:'model-id',before:'Original model displayName'};
  modelCatalog.control.options[0].label = 'Renamed current model';
  const renamedProjection = projectCatalog(modelCatalog,modelSnapshot,'model-id');
  assert.equal(renamedProjection.before,'Original model displayName');
  assert.equal(renamedProjection.after,'Renamed current model');
  modelCatalog.control.options = [];
  const removedProjection = projectCatalog(modelCatalog,modelSnapshot,'model-id');
  assert.equal(removedProjection.before,'Original model displayName');
  assert.equal(removedProjection.after,'formatted:model-id');
  modelCatalog.control.options = [{value:'current-model-sentinel',label:'Current model'}];
  const sentinelProjection = projectCatalog(modelCatalog,{beforeValue:'current-model-sentinel',before:'Current model'},'current-model-sentinel');
  assert.equal(sentinelProjection.before,patchUiZh['Current model']);
  assert.equal(sentinelProjection.after,patchUiZh['Current model']);
  const specPath = 'C:/Project/自定义 specs/High.a';
  const directoryCatalog = {
    catalogItem:{operationId:'sessionDefaults.specMode.saveDirectory.set',section:'Spec Mode',label:'Spec save directory'},
    control:{kind:'select',options:[{value:specPath,label:`Custom (${specPath})`,disabled:true}]},
    formatValue:value=>`Custom (${value})`
  };
  const directoryProjection = projectCatalog(directoryCatalog,{beforeValue:specPath,before:`Custom (${specPath})`},specPath);
  const localizedCustomPath = patchUiZh['Custom ({{path}})'].replaceAll('{{path}}',specPath);
  assert.equal(directoryProjection.before,localizedCustomPath); assert.equal(directoryProjection.after,localizedCustomPath);
  assert.equal(directoryCatalog.control.options[0].value,specPath);
  console.log('Catalog projection PASS: actual replacement localizes switches/enums/sentinels/custom-directory labels, preserves user text and paths, and retains model snapshot names after option rename/removal.');
  const admissionDefinitions={};
  for(const [code,next]of [['queue_already_admitted','run_thread_create_failed'],['sa_required','user_not_found'],['org_default_unavailable','pool_at_capacity']]){
    const start=rendererSource.indexOf(code+':{',rendererSource.indexOf('R3r={')),end=rendererSource.indexOf(','+next+':',start);
    assert.ok(start>=0&&end>start);
    admissionDefinitions[code]=parseDataDeclarations('const entry='+rendererSource.slice(start+code.length+1,end)+';').get('entry');
  }
  const admissionEdit=rendererEdits.find(edit=>edit.find.startsWith('function ZEr(t){'));
  assert.ok(admissionEdit);
  const admissionRuntime=runInNewContext(admissionEdit.replace+';ZEr',{FactoryZhText:textRuntime,R3r:admissionDefinitions,VEr:code=>Object.hasOwn(admissionDefinitions,code),Aqt:()=>({label:'Project',description:'On'})});
  for(const locale of ['en','zh-CN']){
    displayLocale=locale;
    for(const [code,definition]of Object.entries(admissionDefinitions)){
      const result=admissionRuntime(code);
      for(const field of ['label','description']){assert.equal(typeof patchUiZh[definition[field]],'string');assert.equal(result[field],locale==='zh-CN'?patchUiZh[definition[field]]:definition[field]);}
    }
    assert.deepEqual({...admissionRuntime('unknown')},{label:'Project',description:'On'});
  }
  const tierEdit = rendererEdits.find(edit=>edit.find.startsWith("function M3o(t,e=!1){let n;return t<=2?n=\"Basic\":t===3?n=\"Intermediate\":n=\"Advan"));
  const tierBadgeEdit = rendererEdits.find(edit=>edit.find.startsWith("let v;e[9]!==n?(v=M3o(n,!0),e[9]=n,e[10]=v):v=e[10];"));
  const tierModalEdit = rendererEdits.find(edit=>edit.find.startsWith("let B;e[18]!==o?(B=M3o(o),e[18]=o,e[19]=B):B=e[19];"));
  const tierRuntime = runInNewContext(tierEdit.replace+';M3o',{FactoryZhText:textRuntime},{timeout:1000});
  const renderTierBadge = runInNewContext(`(function(){${tierBadgeEdit.replace}return v})`,{
    M3o:tierRuntime,n:3,e:Array(11).fill(Symbol.for('react.memo_cache_sentinel'))
  },{timeout:1000});
  const renderTierModal = runInNewContext(`(function(){${tierModalEdit.replace}return B})`,{
    M3o:tierRuntime,o:3,e:Array(20).fill(Symbol.for('react.memo_cache_sentinel'))
  },{timeout:1000});
  displayLocale='en';
  assert.equal(renderTierBadge(),'INTERMEDIATE');assert.equal(renderTierModal(),'Intermediate');
  for(const [level,expected]of [[1,'BASIC'],[2,'BASIC'],[3,'INTERMEDIATE'],[4,'ADVANCED'],[5,'ADVANCED']]) assert.equal(tierRuntime(level,true),expected);
  displayLocale='zh-CN';
  assert.equal(renderTierBadge(),'中级');assert.equal(renderTierModal(),'中级');
  for(const [level,expected]of [[1,'基础'],[2,'基础'],[3,'中级'],[4,'高级'],[5,'高级']]) {
    assert.equal(tierRuntime(level),expected);assert.equal(tierRuntime(level,true),expected);
  }
  const fieldEdit = rendererEdits.find(edit=>edit.find.startsWith("function A5c(t){const e=Q.c(135),{field:n,id:i,isSaving:o,organizationCredential"));
  const projectField = runInNewContext(fieldEdit.replace+'return n};A5c',{
    FactoryZhText:textRuntime,Q:{c:()=>[]},le:()=>({t:()=>{}})
  },{timeout:1000});
  const fieldEntries=[['Project','On'],['x-header','user value']];
  const projectProviderField=runInNewContext(fieldEdit.replace+'return {field:n,providerMode:r,hiddenProviderPresets:a,error:l,onChange:d}};A5c',{FactoryZhText:textRuntime,Q:{c:()=>[]},le:()=>({t:()=>{}})});
  const providerMode='provider-value',hiddenPresets=['preset-id'],providerError={message:'unchanged'},providerChange=()=>{};
  const providerProjection=projectProviderField({field:{id:'provider',label:'Provider',options:[]},providerMode,hiddenProviderPresets:hiddenPresets,error:providerError,onChange:providerChange});
  assert.equal(providerProjection.providerMode,providerMode);assert.equal(providerProjection.hiddenProviderPresets,hiddenPresets);assert.equal(providerProjection.error,providerError);assert.equal(providerProjection.onChange,providerChange);
  for(const placeholder of ['Use default','How this model appears in the model picker','Optional server credential','Your provider API key','MODEL_API_KEY','/usr/local/bin/mint-model-token']) {
    const field={id:'displayName',label:'Model ID',helper:"The model identifier sent to the provider's API.",placeholder,
      value:'Project',entries:fieldEntries,options:[{value:'unchanged-value',label:'Use default'}]};
    const projected=projectField({field});
    assert.equal(projected.label,patchUiZh[field.label]);assert.equal(projected.helper,patchUiZh[field.helper]);
    assert.equal(projected.placeholder,patchUiZh[placeholder]??placeholder);
    if(!['MODEL_API_KEY','/usr/local/bin/mint-model-token'].includes(placeholder)) assert.match(projected.placeholder,/[\u4e00-\u9fff]/);
    assert.equal(projected.value,'Project');assert.equal(projected.entries,fieldEntries);
    assert.equal(projected.options[0].value,'unchanged-value');assert.equal(projected.options[0].label,patchUiZh['Use default']);
    assert.equal(field.options[0].label,'Use default');
  }
  const providerStart=rendererSource.indexOf('ai=(t=>'),providerEnd=rendererSource.indexOf(',tn=',providerStart);
  assert.ok(providerStart>=0&&providerEnd>providerStart);
  const providerApi=runInNewContext('var '+rendererSource.slice(providerStart,providerEnd)+';ai',{}, {timeout:1000});
  const providerOptions=Object.values(providerApi).map(value=>({value,label:value}));
  const providerField={id:'provider',label:'Provider',value:'anthropic',options:providerOptions};
  assert.deepEqual(Array.from(projectField({field:providerField}).options,option=>[option.value,option.label]),providerOptions.map(option=>[option.value,option.label]));
  const presetStart=rendererSource.indexOf('_pr='),presetEnd=rendererSource.indexOf(',ETt=',presetStart);
  assert.ok(presetStart>=0&&presetEnd>presetStart);
  const presets=runInNewContext('const '+rendererSource.slice(presetStart,presetEnd)+';Gue',{ai:providerApi},{timeout:1000});
  const presetOptions=Array.from(presets,preset=>({value:preset.id,label:preset.label}));
  assert.equal(presetOptions.filter(option=>option.value!=='custom').length,5);
  const projectedPresets=projectField({field:{id:'preset',label:'Provider',value:'custom',options:presetOptions}});
  for(const option of projectedPresets.options) {
    const original=presetOptions.find(item=>item.value===option.value);
    assert.equal(option.label,option.value==='custom'?patchUiZh['Other provider']:original.label);
  }
  const validationEdit = rendererEdits.find(edit=>edit.find.startsWith("function uYn(t){return\"message\"in t?t.message:q1r(t)}"));
  const validationStart=rendererSource.indexOf('function q1r('),validationEnd=rendererSource.indexOf('function K1r(',validationStart);
  assert.ok(validationStart>=0&&validationEnd>validationStart);
  const validationSource=rendererSource.slice(validationStart,validationEnd);
  const validationNames=[...validationSource.matchAll(/case mb\.(\w+):/g)].map(match=>match[1]);
  assert.equal(validationNames.length,9);
  const validationRuntime=runInNewContext(validationSource+validationEdit.replace+';({q1r,uYn})',{
    FactoryZhText:textRuntime,mb:Object.fromEntries(validationNames.map(name=>[name,name]))
  },{timeout:1000});
  for(const code of validationNames) assert.equal(validationRuntime.uYn({code}),patchUiZh[validationRuntime.q1r({code})]);
  for(const message of ['Project','On','Unknown validation message','C:/Project/user-value']) assert.equal(validationRuntime.uYn({code:validationNames[0],message}),message);
  const checkboxEdit = rendererEdits.find(edit=>edit.find.startsWith("let A;e[4]!==p?(A=c.jsx(yc,{\"aria-label\":\"Select row\",...p}),e[4]=p,e[5]=A):A=e["));
  const renderCheckbox=runInNewContext(`(function(p){${checkboxEdit.replace}return A})`,{
    FactoryZhText:textRuntime,c:{jsx:(type,props)=>props},yc:'checkbox',e:Array(6).fill(Symbol.for('react.memo_cache_sentinel'))
  },{timeout:1000});
  const checkboxProps={checked:true};
  displayLocale='en';assert.equal(renderCheckbox(checkboxProps)['aria-label'],'Select row');
  displayLocale='zh-CN';assert.equal(renderCheckbox(checkboxProps)['aria-label'],patchUiZh['Select row']);
  const callerCheckbox={'aria-label':'Project',checked:false};
  assert.equal(renderCheckbox(callerCheckbox)['aria-label'],'Project');assert.equal(renderCheckbox(callerCheckbox).checked,false);
  console.log('Readiness/form/accessibility PASS: actual replacements refresh tier caches, translate only form display fields and fixed validation errors, preserve API names/preset brands/user data, and respect caller checkbox labels.');
  const badgeEdit = rendererEdits.find(edit=>edit.find.startsWith("function dbf(t){return c.jsxs(G,{bg:w.bg.surface,borderColor:w.border.outer,bord"));
  const badgeDataStart=badgeEdit.replace.indexOf('const e='),badgeDataEnd=badgeEdit.replace.indexOf('].some(',badgeDataStart);
  assert.ok(badgeDataStart>=0&&badgeDataEnd>badgeDataStart);
  const badgeTriples=parseDataDeclarations(badgeEdit.replace.slice(badgeDataStart,badgeDataEnd+1)+';').get('e');
  assert.equal(badgeTriples.length,29);
  const renderBadge=runInNewContext(badgeEdit.replace+';dbf',{
    FactoryZhText:textRuntime,c:{jsx:(type,props)=>props,jsxs:(type,props)=>props},G:'card',se:'text',Me:'box',
    w:{bg:{surface:0},border:{outer:0},radius:{surface:0},space:{4:4,20:20}},re:{Caption:0,ButtonLabel:1},Be:{Secondary:0,Tertiary:1}
  },{timeout:1000});
  const badgeTexts=dto=>{const view=renderBadge(dto);return[view.children[0].children,view.children[1].children,view.children[2]?.children.children];};
  for(const triple of badgeTriples) {
    const dto=Object.freeze({name:triple[0],description:triple[1],quip:triple[2],earnedAt:'unchanged'});
    displayLocale='en';assert.deepEqual(badgeTexts(dto),triple);
    displayLocale='zh-CN';
    const expected=triple.map(text=>patchUiZh[text]??text);
    assert.deepEqual(badgeTexts(dto),expected);
    assert.deepEqual([dto.name,dto.description,dto.quip],triple);assert.equal(dto.earnedAt,'unchanged');
    assert.ok(expected.every((text,index)=>/[\u4e00-\u9fff]/.test(text)||(index===2&&text==='if err != nil { return err }')));
  }
  for(const dto of [{name:'Project',description:'On',quip:'Unknown badge'},
    {name:badgeTriples[0][0],description:badgeTriples[0][1],quip:'Changed quip'},
    {name:badgeTriples[0][0],description:'Changed description',quip:badgeTriples[0][2]},
    {name:'Changed name',description:badgeTriples[0][1],quip:badgeTriples[0][2]}]) assert.deepEqual(badgeTexts(dto),[dto.name,dto.description,dto.quip]);
  const durationEdit = rendererEdits.find(edit=>edit.find.startsWith("function hFt(t){const e=t/36e5;if(e>=24){const i=Math.floor(e/24),o=Math.round(e"));
  const statsHeroEdit = rendererEdits.find(edit=>edit.find.startsWith("function ubf(t){const e=t.longestSession?.assistantActiveTimeMs??0,n=K2f(t.first"));
  const originalStats=runInNewContext(durationEdit.find+statsHeroEdit.find+';({hFt,ubf})',{
    q2f:value=>String(value),K2f:()=>17
  },{timeout:1000});
  const localizedStats=runInNewContext(durationEdit.replace+statsHeroEdit.replace+';({hFt,ubf})',{
    Intl,Zmn:()=>({language:displayLocale}),q2f:value=>String(value),K2f:()=>17
  },{timeout:1000});
  for(const milliseconds of [0,1,29400,30000,89999,3599999,3600000,5399999,5400000,86399999,86400000,171000000,172800000,360000000]) {
    displayLocale='en';assert.equal(localizedStats.hFt(milliseconds),originalStats.hFt(milliseconds),String(milliseconds));
    const dto=Object.freeze({totalSessions:1234,totalTimeMs:milliseconds,longestStreak:9,firstSessionDate:'2026-10-01',longestSession:Object.freeze({assistantActiveTimeMs:milliseconds})});
    const before=JSON.stringify(dto);
    assert.equal(JSON.stringify(localizedStats.ubf(dto)),JSON.stringify(originalStats.ubf(dto)));
    displayLocale='zh-CN';const hero=localizedStats.ubf(dto);
    assert.equal(hero[0].value,'1234');assert.equal(hero[2].value,'9天');assert.equal(hero[4].value,'17天');
    assert.match(hero[1].value,/天|小时|分钟/);assert.equal(hero[3].value,hero[1].value);
    assert.deepEqual(Array.from(hero,item=>item.value.match(/\d+/g)?.map(Number)),Array.from(originalStats.ubf(dto),item=>item.value.match(/\d+/g)?.map(Number)));
    assert.equal(JSON.stringify(dto),before);
  }
  console.log('Stats display PASS: all 29 actual badge triples localize without DTO mutation; unknown/changed tuples and Go code stay raw; duration/day units localize with original English thresholds, rounding and numbers preserved.');
  console.log('Display patch regression PASS: actual country/range/tab replacements refresh with locale while preserving ISO values, selections and callbacks; actual text helper preserves fallbacks and interpolates paths.');
  const hintEdit = rendererEdits.find(edit=>edit.find.startsWith("let f;e[15]!==n.hint||e[16]!==n.status||e[17]!==s.textColor?(f=n.hint&&n.status!"));
  assert.ok(hintEdit,'Diagnostic hint projection patch must be present');
  const renderDiagnostic=runInNewContext(`(function(n){${hintEdit.replace}return f})`,{
    FactoryZhText:textRuntime,s:{textColor:'warning'},et:'text',c:{jsx:(_type,props)=>props.children}
  },{timeout:1000});
  for(const [id,prefix]of [['daemon_state','An EDR-protected process holds'],['zombie_socket','PID {{pid}} owns port'],['zombie_socket','The Windows kernel reports PID {{pid}}']]) {
    const key=Object.keys(patchUiEn).find(key=>key.startsWith(prefix));assert.ok(key);
    const raw=key.replaceAll('{{pid}}','12345').replaceAll('{{port}}','3333');
    const check={id,status:'warning',hint:raw,detail:'ECONNREFUSED 127.0.0.1:3333'},before=JSON.stringify(check);
    displayLocale='en';assert.equal(renderDiagnostic(check),raw);
    displayLocale='zh-CN';assert.equal(renderDiagnostic(check),patchUiZh[key].replaceAll('{{pid}}','12345').replaceAll('{{port}}','3333'));
    assert.equal(JSON.stringify(check),before,'Diagnostic DTO and technical detail must remain unchanged');
    assert.equal(renderDiagnostic({...check,id:'unrelated_check'}),raw,'Unknown check IDs must not trigger template parsing');
    if(raw.includes('findstr 3333')) {
      const differentPort=raw.replace('findstr 3333','findstr 3334');
      assert.equal(renderDiagnostic({...check,hint:differentPort}),differentPort,'A non-matching complete template must remain raw');
    }
  }
  console.log('Diagnostic display PASS: three actual PID/port hint projections preserve values and original DTO; language switches refresh; unknown IDs and unmatched templates stay raw.');
  for (const ns of Object.keys(en)) {
    for (const [key,text] of leafEntries(en[ns])) validateText(text,text,`${ns}.${key}`);
  }
  validateText('<a>{{name}}</a><b>Value</b>', '<b>值</b><a>{{name}}</a>');
  validateText('Path ~/{{dir}}/<automation-slug>', '路径 ~/{{dir}}/<automation-slug>');
  assert.throws(()=>validateText('Path ~/{{dir}}/<automation-slug>','路径 ~/{{dir}}/<slug>'));
  const invalidTexts = [
    ['{{name}} {{name}}','{{name}}'], ['{{name, number}}','{{name}}'],
    ['<a><b>text</b></a>','<b><a>文本</a></b>'], ['<a><b>text</b></a>','<a><b>文本</a></b>'],
    ['<name/>','<name></name>'], ['text',''], ['https://example.com/a','https://example.com/b'],
    ['Run `npm install`','运行 `npm update`'], ['{{name}}','{{name}} {{oops']
  ];
  for (const [source,translation] of invalidTexts) assert.throws(()=>validateText(source,translation));
  for (const translation of [{unknown:'值'},{text:null},{text:1}]) assert.throws(()=>validateTree({text:'text'},translation));
  console.log('Resource validator PASS: all source strings accepted; sibling tag reorder accepted; 12 invalid translation cases rejected.');
  const coverageEn={one:{action:'Open',brand:'Factory'},two:{menu:'Close'}};
  const policy={preservedEnglish:[{key:'one.brand',source:'Factory',reason:'Brand'}]};
  const measured=measureCoverage(coverageEn,{one:{action:'打开',brand:'Factory'}},policy);
  assert.equal(measured.summary.total,3);assert.equal(measured.summary.missingRequired,1);assert.deepEqual(measured.namespaces.two.missingKeys,['menu']);
  assert.equal(measured.summary.preservedEnglish,1);
  assert.equal(measureCoverage(coverageEn,{one:{action:'打开',brand:'Factory'}},{...policy,excludedKeys:[{key:'two.menu',source:'Close',reason:'Fixture only'}]}).summary.missingRequired,0);
  for(const badPolicy of [
    {excludedKeys:[{key:'one.action',source:'Open',reason:'hidden'}]},
    {preservedEnglish:[{key:'one.brand',source:'Changed',reason:'stale'}]},
    {preservedEnglish:[{key:'unknown',source:'x',reason:'bad'}]},
    {preservedEnglish:[{key:'one.brand',source:'Factory',reason:''}]},
    {preservedEnglish:[...policy.preservedEnglish,...policy.preservedEnglish]}
  ]) assert.throws(()=>measureCoverage(coverageEn,{one:{action:'打开',brand:'Factory'}},badPolicy));
  assert.throws(()=>measureCoverage(coverageEn,{unknown:{action:'打开'}},policy));
  assert.throws(()=>measureCoverage(coverageEn,{one:{unknown:'打开'}},policy));
  assert.throws(()=>measureCoverage(coverageEn,{one:{action:'打开',brand:'工厂'}},policy));
  const terminology=readJson(join(REPO_ROOT,'translations/terminology.json'));
  for(const rule of terminology.contextRules) {
    validateTerminology(rule.source,rule.expected,rule.key,terminology);
    assert.throws(()=>validateTerminology(rule.source,'错误译文',rule.key,terminology));
  }
  assert.throws(()=>validateTerminology('Factory Desktop','Factory 桌面版','fixture',terminology));
  assert.throws(()=>validateTerminology('Claude','Gemini','fixture',terminology));
  const termSource = new Map(Object.entries({...en,desktop,patchUi:patchUiEn}).flatMap(([ns,tree])=>leafEntries(tree).map(([key,value])=>[`${ns}.${key}`,value])));
  const termTranslations = new Map([...Object.keys(en),'desktop'].flatMap(ns=>leafEntries(readJson(join(REPO_ROOT,`translations/zh-CN/${ns}.json`))).map(([key,value])=>[`${ns}.${key}`,value])).concat(leafEntries(patchUiZh).map(([key,value])=>[`patchUi.${key}`,value])));
  for(const rule of terminology.preserveTerms.filter(rule=>rule.keys)) {
    assert.equal(new Set(rule.keys).size,rule.keys.length);
    for(const key of rule.keys) {
      assert.ok(termSource.has(key),`Stale terminology context ${key}`);
      const source=termSource.get(key),translation=termTranslations.get(key);
      assert.match(source,new RegExp(rule.pattern,rule.ignoreCase?'i':''));
      validateTerminology(source,translation,key,terminology);
      assert.throws(()=>validateTerminology(source,translation.replace(new RegExp(rule.pattern,rule.ignoreCase?'gi':'g'),'误译'),key,terminology));
    }
  }
  validateTerminology('Hook Droid into your systems','将 Droid 接入你的系统','academy.lessons.automations.eventTriggers.description',terminology);
  validateTerminology('an injected hook is failing','注入的钩子发生故障','fixture.systemHook',terminology);
  validateTerminology('Subagent Task Models','子代理 Task 模型','settings.sessionDefaultsSection.subagentTaskModels',terminology);
  console.log('Coverage/terminology PASS: missing whole namespaces counted; stale, hidden, unknown and changed preserved keys rejected; all context rules enforced.');
  const start = rendererSource.indexOf('var BA=(t=>'), end = rendererSource.indexOf('const ZCt=[',start);
  assert.ok(start>=0&&end>start);
  const anatomy = runInNewContext(rendererSource.slice(start,end)+';({rbc,abc})',{}, {timeout:1000});
  const zhKeywords=readJson(join(REPO_ROOT,'translations/zh-CN/components.json')).lessons.lessonPromptAnatomy.keywords;
  const keywords=anatomy.rbc((key,options)=>(options?.lng==='en'?en.components.lessons.lessonPromptAnatomy.keywords:zhKeywords)[key.split('.').at(-1)]);
  for(const draft of ['修复登录页面 src/auth.ts，不要修改公共 API；运行测试并验证结果。','Fix the login page in src/auth.ts without changing public APIs; run tests and verify the result.']) assert.ok(Object.values(anatomy.abc({draft,keywords})).every(Boolean),draft);
  const englishOnly=anatomy.rbc(key=>en.components.lessons.lessonPromptAnatomy.keywords[key.split('.').at(-1)]);
  assert.equal(anatomy.abc({draft:'修复登录页面，不要修改公共接口；运行测试并验证结果。',keywords:englishOnly}).outcome,false);
  console.log('Lesson anatomy PASS: actual pristine matcher recognizes Chinese and English prompts with localized keywords; English-only list reproduces prior Chinese failure.');
} finally { closeAsar(asar); }

if (process.argv.includes('--exercise')) {
  // All installed-file writes below are confined to this new full version copy.
  const exercise = mkdtempSync(join(REPO_ROOT, 'work', 'exercise-'));
  const copyHome = join(exercise, 'app-0.207.0');
  const real = context({home});
  const realPair = pairHash(real.files);
  const results = [];
  const snapshot = (dir) => !existsSync(dir) ? null : readdirSync(dir,{recursive:true}).sort().map(name => {
    const file = join(dir,name), info = statSync(file);
    return info.isFile() ? [name,info.size,info.mtimeMs,fileHash(file)] : [name,'directory'];
  });
  const realState = snapshot(real.state);
  const realRemarksPath = join(process.env.USERPROFILE, '.factory', 'factory-expand.json');
  const realRemarksBefore = existsSync(realRemarksPath) ? fileHash(realRemarksPath) : null;
  const remarksPath = join(exercise, 'user-data', 'factory-expand.json');
  let remarksBefore;
  const sourceFile = join(REPO_ROOT,'translations/zh-CN/common.json');
  const sourceBefore = readFileSync(sourceFile);
  const buildFile = join(REPO_ROOT,'translations/build/0.207.0/resources-zh-CN.js');
  const coverageFile = join(REPO_ROOT,'translations/build/0.207.0/coverage.json');
  const desktopFile = join(REPO_ROOT,'translations/build/0.207.0/desktop-zh-CN.json');
  const buildBefore = readFileSync(buildFile), coverageBefore = readFileSync(coverageFile);
  const desktopBefore = readFileSync(desktopFile);
  const legacyBuild = ['translations/build','translations/build/0.201.0','translations/build/0.202.0','translations/build/0.204.0','translations/build/0.205.0'].flatMap(dir=>['resources-zh-CN.js','desktop-zh-CN.json','coverage.json'].map(name=>join(REPO_ROOT,dir,name)));
  const legacyBefore = legacyBuild.map(file=>fileHash(file));
  writeFileSync(join(exercise,'isolation-before.json'),JSON.stringify({realPair,realState,legacyBefore,source:fileHash(sourceFile),build:[buildFile,desktopFile,coverageFile].map(file=>fileHash(file))},null,2));
  const pass = (name) => { results.push(name); console.log(`Exercise PASS: ${name}`); writeFileSync(join(exercise,'results.json'),JSON.stringify({results},null,2)); };
  const run = (operation, flags = [], expected = 0) => {
    const result = spawnSync(process.execPath,[join(REPO_ROOT,'scripts',`${operation}.mjs`),`--home=${copyHome}`,...flags],{cwd:REPO_ROOT,encoding:'utf8',windowsHide:true,timeout:180000});
    const output = (result.stdout ?? '') + (result.stderr ?? '');
    if (result.status !== expected) throw new Error(`${operation} ${flags} returned ${result.status}, expected ${expected}: ${output}`);
    if (remarksBefore) assert.equal(fileHash(remarksPath), remarksBefore, 'Installer operations must preserve project remarks');
    return output;
  };
  const build = () => {
    const result = spawnSync(process.execPath,[join(REPO_ROOT,'tools/build_resource.mjs')],{cwd:REPO_ROOT,encoding:'utf8',windowsHide:true});
    assert.equal(result.status,0,result.stderr);
  };
  let ctx;
  try {
    const remarksStore = projectRemarksRuntime.createRemarksStore({ filePath: remarksPath });
    await remarksStore.set({ key: 'C:/exercise/project', remark: '副本自检' });
    remarksBefore = fileHash(remarksPath);
    cpSync(home,copyHome,{recursive:true,errorOnExist:true,force:false});
    ctx = context({home:copyHome});
    assert.ok(ctx.normalized.startsWith(join(REPO_ROOT,'work').toLowerCase()+'\\'));
    assert.notEqual(ctx.state,real.state);
    assert.deepEqual(pairHash(ctx.files),realPair);
    assert.equal(fileHash(join(`${ctx.files.asar}.unpacked`,'node_modules/keytar/build/Release/keytar.node')),ctx.manifest.unpacked['node_modules/keytar/build/Release/keytar.node']);
    // The running installation may already be localized; exercise a clean copy
    // using the verified immutable baseline, never changing the real install.
    for(const name of ['exe','asar']) { chmodSync(ctx.files[name],0o666);copyFileSync(baseline[name],ctx.files[name]);chmodSync(ctx.files[name],0o666); }
    const originalPair=pairHash(baseline);
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
    assert.deepEqual(pairHash(ctx.files),originalPair);
    assert.equal(existsSync(ctx.applied),false); assert.equal(existsSync(ctx.pending),false);
    pass('read-only second target fails after exe replacement; both files and absent applied record recovered');

    assert.match(run('apply'),/Applied Chinese localization/);
    const patched = pairHash(ctx.files), applied = readJson(ctx.applied);
    assert.ok(!samePair(patched,originalPair));
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
    assert.deepEqual(pairHash(ctx.files),originalPair); assert.match(run('restore',['--check']),/Restored/);
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
    // Dropping a source and its translation together must not turn a partial
    // resource universe into a misleading 100% coverage report.
    unlinkSync(join(fixture,'translations/en/analytics2.json'));
    unlinkSync(join(fixture,'translations/zh-CN/analytics2.json'));
    const missingSource = spawnSync(process.execPath,[join(fixture,'tools/build_resource.mjs')],{cwd:fixture,encoding:'utf8',windowsHide:true});
    assert.equal(missingSource.status,1);assert.match(missingSource.stdout+missingSource.stderr,/Incomplete pinned English namespace set/);
    pass('paired source/translation namespace omission refused by pinned source manifest');
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
      const pending = {home:ctx.normalized,appVersion:'0.207.0',before:pairHash(beforeFiles),after:pairHash(afterFiles),backup,beforeApplied};
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
    assert.deepEqual(pairHash(ctx.files),originalPair);

    run('apply');
    const translated = JSON.parse(sourceBefore); translated.actions.contactUs += '（自检）';
    writeFileSync(sourceFile,JSON.stringify(translated,null,2)+'\n'); build();
    assert.match(run('verify',[],1),/Translation source changed/);
    assert.match(run('apply',[],1),/Translation source changed/);
    run('restore'); build(); run('apply'); run('verify'); run('restore');
    writeFileSync(sourceFile,sourceBefore); build();
    assert.deepEqual(readFileSync(buildFile),buildBefore);
    assert.deepEqual(readFileSync(coverageFile),coverageBefore);
    assert.deepEqual(readFileSync(desktopFile),desktopBefore);
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
    assert.deepEqual(pairHash(ctx.files),originalPair);
    pass('live lock refused; simultaneous stale-lock takeover serialized without deleting another live lock');

    const wrapper = spawnSync('cmd.exe',['/d','/c','verify.cmd',`--home=${copyHome}`],{cwd:REPO_ROOT,encoding:'utf8',windowsHide:true});
    assert.equal(wrapper.status,1); assert.match(wrapper.stdout+wrapper.stderr,/Not applied/);
    assert.deepEqual(pairHash(real.files),realPair); assert.deepEqual(snapshot(real.state),realState);
    assert.notEqual(ctx.state,real.state); assert.notEqual(ctx.pending,real.pending);
    pass('cmd preserves nonzero exit; real installation/state isolated and unchanged throughout');
    assert.equal(fileHash(remarksPath), remarksBefore);
    assert.equal((await projectRemarksRuntime.createRemarksStore({ filePath: remarksPath }).get()).projectRemarks['C:/exercise/project'], '副本自检');
    pass('remarks bytes survive every installer apply/verify/repeat/restore and a fresh store reload');

    // Export the complete old tools, not just JSON: old env pins the old 2/2 shape.
    const upgradeFixture = join(exercise, 'upgrade-tool-fixture');
    const upgradeHome = join(exercise, 'upgrade-app-0.202.0');
    mkdirSync(upgradeFixture);
    const oldFiles = execFileSync('git', ['ls-tree','-r','--name-only','dc07e7f','--','scripts','tools','patches','translations','package.json'], {cwd:REPO_ROOT,encoding:'utf8'}).trim().split(/\r?\n/);
    for (const path of oldFiles) {
      const destination = resolve(upgradeFixture,path);
      assert.ok(destination.startsWith(resolve(upgradeFixture) + '\\'));
      mkdirSync(dirname(destination), {recursive:true});
      writeFileSync(destination,execFileSync('git',['show',`dc07e7f:${path}`],{cwd:REPO_ROOT,maxBuffer:16*1024*1024}));
    }
    const historicalSet=loadPatchSet('0.202.0');
    const oldCandidates=['C:/Users/11013/AppData/Local/Factory/app-0.202.0',...readdirSync(join(REPO_ROOT,'work'),{withFileTypes:true})
      .filter(entry=>entry.isDirectory()&&entry.name.startsWith('exercise-'))
      .flatMap(entry=>['app-0.202.0','upgrade-app-0.202.0'].map(name=>join(REPO_ROOT,'work',entry.name,name)))];
    const oldHome=oldCandidates.find(candidate=>{
      const files={exe:join(candidate,'factory-desktop.exe'),asar:join(candidate,'resources/app.asar')};
      return Object.values(files).every(existsSync)&&samePair(pairHash(files),historicalSet.manifest.original)&&
        Object.entries(historicalSet.manifest.unpacked).every(([file,hash])=>existsSync(join(files.asar+'.unpacked',file))&&fileHash(join(files.asar+'.unpacked',file))===hash);
    });
    assert.ok(oldHome,'Historical upgrade requires the pinned original 0.202.0 full install or a verified exercise copy; none is available');
    const oldContext=context({home:oldHome}),oldSet=loadPatchSet('0.202.0');
    const oldPristine=checkedPristine(oldContext,oldSet.patches);assert.ok(oldPristine);
    cpSync(oldHome,upgradeHome,{recursive:true,errorOnExist:true,force:false});
    for(const [name,destination]of [['exe','factory-desktop.exe'],['asar','resources/app.asar']]){const target=join(upgradeHome,destination);chmodSync(target,0o666);copyFileSync(oldPristine[name],target);chmodSync(target,0o666);}
    const upgradePristine = join(upgradeFixture,relative(REPO_ROOT,oldContext.pristine.dir));
    cpSync(oldContext.pristine.dir,upgradePristine,{recursive:true});
    const upgradeRun = (operation,flags=[],expected=0) => {
      const result=spawnSync(process.execPath,[join(upgradeFixture,'scripts',`${operation}.mjs`),`--home=${upgradeHome}`,...flags],{cwd:upgradeFixture,encoding:'utf8',windowsHide:true,timeout:180000});
      const output=(result.stdout??'')+(result.stderr??'');
      assert.equal(result.status,expected,output);
      assert.equal(fileHash(remarksPath),remarksBefore);
      return output;
    };
    assert.match(upgradeRun('apply'),/Applied Chinese localization/);
    for(const dir of ['scripts','tools','patches','translations']) cpSync(join(REPO_ROOT,dir),join(upgradeFixture,dir),{recursive:true});
    assert.match(upgradeRun('apply',['--dry-run'],1),/Missing\/non-unique marker|Translation source changed/);
    assert.match(upgradeRun('restore',['--check']),/restorable/);
    upgradeRun('restore');
    assert.match(upgradeRun('apply',['--dry-run']),/Dry-run PASS/);
    upgradeRun('apply'); upgradeRun('verify');
    assert.match(upgradeRun('apply'),/Already applied/);
    upgradeRun('restore');
    pass('complete old 2/44/2 localization upgrades via restore to new 3/49/4 and remains restorable');
    console.log(`Full exercise PASS: ${results.length} scenarios; artifacts ${exercise}`);
  } catch(error) {
    writeFileSync(join(exercise,'results.json'),JSON.stringify({results,error:error.stack},null,2));
    throw error;
  } finally {
    writeFileSync(sourceFile,sourceBefore); writeFileSync(buildFile,buildBefore); writeFileSync(coverageFile,coverageBefore); writeFileSync(desktopFile,desktopBefore);
    if(ctx) chmodSync(ctx.files.asar,0o666);
    assert.deepEqual(pairHash(real.files),realPair,'Real installed pair must remain unchanged');
    assert.deepEqual(snapshot(real.state),realState,'Real installed state must remain unchanged');
    assert.deepEqual(legacyBuild.map(file=>fileHash(file)),legacyBefore,'Pinned 0.200.0/0.201.0/0.202.0/0.204.0/0.205.0 builds must remain unchanged');
    assert.equal(existsSync(realRemarksPath) ? fileHash(realRemarksPath) : null, realRemarksBefore, 'Real user remarks must remain unchanged');
    writeFileSync(join(exercise,'isolation-after.json'),JSON.stringify({realPair:pairHash(real.files),realState:snapshot(real.state),legacyBefore:legacyBuild.map(file=>fileHash(file)),source:fileHash(sourceFile),build:[buildFile,desktopFile,coverageFile].map(file=>fileHash(file))},null,2));
  }
}
