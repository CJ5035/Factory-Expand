import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { checkJavaScript } from '../scripts/lib/syntaxcheck.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appVersion = '0.202.0';
export const firstBatch = ['common','settings','sessions','softwareFactory','inbox','onboarding','errors'];
// These four pinned lesson strings use angle brackets as editable prompt
// placeholders, rather than paired rich-text elements. Keep their exact tokens.
const literalPromptTags = new Map([
  ['Create a private scheduled automation. Every Monday at 9am my time, summarize tickets in <project> that changed last week as Blocked, Needs review, and Other. Reply in the run only; don’t edit tickets or post. If nothing changed, reply "No updates." {{confirmFirst}}',['<project>']],
  ['I want to automate a task I repeat: <describe it>. Ask what should start it, where results go, and what it must never do. Then write private automation instructions with a source, task, output, and limits. {{confirmFirst}}',['<describe it>']],
  ['Start a new session, pick a draft below, fill in the <placeholders>, and send it.',['<placeholders>']],
  ['Check this computer is ready to work on <repository>: clone it if it’s missing, install dependencies, and run the tests. Report what’s missing or failing. Don’t change any code.',['<repository>']]
]);

export function leafEntries(tree, prefix = '') {
  if (tree !== null && typeof tree === 'object') return Object.entries(tree).flatMap(([key, child]) => leafEntries(child, prefix ? `${prefix}.${key}` : key));
  return [[prefix, tree]];
}

function tagStructure(text, literalTags = new Set()) {
  const roots = [];
  const stack = [{ children: roots }];
  for (const match of text.matchAll(/<(\/?)([A-Za-z][\w:-]*|\d+)(\s[^<>]*?)?(\/?)>/g)) {
    if (literalTags.has(match[0])) { stack.at(-1).children.push({name:match[0],attrs:'literal-path-placeholder',single:true,children:[]}); continue; }
    const [, closing, name, attrs = '', slash] = match;
    if (closing) {
      if (slash || attrs.trim() || stack.length === 1 || stack.at(-1).name !== name) throw new Error(`Unbalanced rich-text tag ${match[0]}`);
      stack.pop();
    } else {
      const single = !!slash || ['br','hr','img','input','wbr'].includes(name);
      const item = { name, attrs, single, children: [] };
      stack.at(-1).children.push(item);
      if (!single) stack.push(item);
    }
  }
  if (stack.length !== 1) throw new Error(`Unclosed rich-text tag ${stack.at(-1).name}`);
  const signature = (items) => items.map(item => JSON.stringify([item.name,item.attrs,item.single,signature(item.children)])).sort();
  return JSON.stringify(signature(roots));
}

export function validateText(english, chinese, label = '') {
  if (!chinese.trim()) throw new Error(`Empty translation: ${label}`);
  for (const text of [english,chinese]) if ((text.match(/{{|}}/g)?.length ?? 0) !== (text.match(/{{[\s\S]*?}}/g)?.length ?? 0) * 2) throw new Error(`Malformed interpolation: ${label}`);
  const tokens = (text, regex) => [...text.matchAll(regex)].map(match => match[0]).sort();
  const sameTokens = (regex, kind) => {
    if (JSON.stringify(tokens(english, regex)) !== JSON.stringify(tokens(chinese, regex))) throw new Error(`${kind} mismatch: ${label}`);
  };
  sameTokens(/{{[\s\S]*?}}/g, 'Interpolation');
  sameTokens(/%\{[^{}]+\}/g, 'Chart interpolation');
  const literalTags = new Set([...english.matchAll(/[\/\\](<[A-Za-z][\w-]*>)/g)].map(match=>match[1]).concat(literalPromptTags.get(english) ?? []));
  if (tagStructure(english,literalTags) !== tagStructure(chinese,literalTags)) throw new Error(`Rich-text structure mismatch: ${label}`);
  sameTokens(/https?:\/\/[^\s<>()"'`，。；！]+/g, 'URL');
  sameTokens(/(`+)[\s\S]*?\1/g, 'Code fragment');
}

export function validateTerminology(english, chinese, label, policy) {
  for (const rule of policy.preserveTerms ?? []) {
    const pattern = new RegExp(rule.pattern, rule.ignoreCase ? 'gi' : 'g');
    const count = [...english.matchAll(pattern)].length;
    if (count && [...chinese.matchAll(pattern)].length !== count) throw new Error(`Protected term ${rule.name} mismatch: ${label}`);
    if (count && rule.exactMatches) {
      const tokens = text => [...text.matchAll(pattern)].map(match=>rule.ignoreCase?match[0].toLowerCase():match[0]).sort();
      if (JSON.stringify(tokens(english)) !== JSON.stringify(tokens(chinese))) throw new Error(`Protected identifier ${rule.name} changed: ${label}`);
    }
  }
  const rule = policy.contextRules?.find(rule => rule.key === label);
  if (rule && (rule.source !== english || rule.expected !== chinese)) throw new Error(`Context terminology mismatch: ${label}`);
}

export function validateTree(english, chinese, label = '', terminology = null) {
  if (english === null || chinese === null || typeof english !== typeof chinese || Array.isArray(english) !== Array.isArray(chinese)) throw new Error(`Type mismatch: ${label}`);
  if (typeof english === 'string') {
    validateText(english, chinese, label);
    if (terminology) validateTerminology(english, chinese, label, terminology);
    return;
  }
  if (typeof english !== 'object') {
    if (english !== chinese) throw new Error(`Non-string value changed: ${label}`);
    return;
  }
  if (Array.isArray(english) && english.length !== chinese.length) throw new Error(`Array length mismatch: ${label}`);
  for (const [key, child] of Object.entries(chinese)) {
    if (!Object.hasOwn(english, key)) throw new Error(`Unknown key: ${label}.${key}`);
    validateTree(english[key], child, `${label}.${key}`, terminology);
  }
}

export function measureCoverage(english, chinese, policy = {}) {
  for (const [ns, tree] of Object.entries(chinese)) {
    if (!Object.hasOwn(english, ns)) throw new Error(`Unknown namespace: ${ns}`);
    validateTree(english[ns], tree, ns);
  }
  const namespaces = {};
  const summary = { total: 0, provided: 0, missing: 0, excluded: 0, missingRequired: 0, changed: 0, identical: 0, preservedEnglish: 0, courseProse: 0 };
  const exclusions = new Map((policy.excludedKeys ?? []).map(item => [item.key,item]));
  const preserved = new Map((policy.preservedEnglish ?? []).map(item => [item.key,item]));
  if(exclusions.size !== (policy.excludedKeys ?? []).length || preserved.size !== (policy.preservedEnglish ?? []).length) throw new Error('Duplicate coverage policy key');
  const seen = new Set();
  for (const [ns, source] of Object.entries(english)) {
    const all = new Map(leafEntries(source));
    const supplied = new Map(chinese[ns] ? leafEntries(chinese[ns]) : []);
    const missingKeys = [], excludedKeys = [], identicalKeys = [], preservedEnglishKeys = [], unreviewedEnglishKeys = [], courseProseKeys = [];
    for(const [key,text] of all) {
      const fullKey = `${ns}.${key}`; seen.add(fullKey);
      const exclusion = exclusions.get(fullKey), allowed = preserved.get(fullKey);
      for(const entry of [exclusion,allowed]) if(entry && (entry.source !== text || !entry.reason?.trim())) throw new Error(`Invalid/stale coverage policy: ${fullKey}`);
      if(exclusion && supplied.has(key)) throw new Error(`Exclusion hides a provided key: ${fullKey}`);
      if(exclusion && allowed) throw new Error(`Conflicting coverage policy: ${fullKey}`);
      if(allowed && supplied.has(key) && supplied.get(key) !== text) throw new Error(`Preserved English changed: ${fullKey}`);
      if(!supplied.has(key)) { if(exclusion)excludedKeys.push(key);else missingKeys.push(key);continue; }
      if(supplied.get(key) === text) {
        identicalKeys.push(key);
        if(allowed?.category==='course-prose')courseProseKeys.push(key);
        const words = String(text).replace(/{{[\s\S]*?}}/g,'').replace(/https?:\/\/[^\s<>()"'`]+/g,'').replace(/(`+)[\s\S]*?\1/g,'');
        if(/[A-Za-z]/.test(words)) { if(allowed)preservedEnglishKeys.push(key);else unreviewedEnglishKeys.push(key); }
      }
    }
    const row = { total:all.size,provided:supplied.size,missing:all.size-supplied.size,excluded:excludedKeys.length,missingRequired:missingKeys.length,changed:supplied.size-identicalKeys.length,identical:identicalKeys.length,preservedEnglish:preservedEnglishKeys.length,courseProse:courseProseKeys.length,missingKeys,excludedKeys,identicalKeys,preservedEnglishKeys,unreviewedEnglishKeys,courseProseKeys };
    namespaces[ns] = row;
    for(const key of Object.keys(summary)) summary[key] += row[key];
  }
  for(const key of [...exclusions.keys(),...preserved.keys()]) if(!seen.has(key)) throw new Error(`Unknown coverage policy key: ${key}`);
  summary.required = summary.total-summary.excluded;
  summary.requiredCoveragePercent = summary.required ? Number(((summary.required-summary.missingRequired)/summary.required*100).toFixed(2)) : 100;
  summary.resourceCoveragePercent = summary.total ? Number((summary.provided/summary.total*100).toFixed(2)) : 100;
  summary.functionalTotal=summary.total-summary.courseProse;
  summary.functionalProvided=summary.provided-summary.courseProse;
  summary.functionalCoveragePercent=summary.functionalTotal?Number((summary.functionalProvided/summary.functionalTotal*100).toFixed(2)):100;
  return { schemaVersion:2, summary, namespaces, note:'Provided keys include reviewed English brands/code/identifiers and user-selected original English course prose. Functional coverage excludes only the explicit course-prose keys; no source keys disappear from the total. Resource coverage is not a claim that every UI state, native menu or server-provided string was visually tested.' };
}

export function buildResource() {
  const enDir = join(root, 'translations/en');
  const zhDir = join(root, 'translations/zh-CN');
  const resources = {}, englishResources = {};
  const terminology = JSON.parse(readFileSync(join(root,'translations/terminology.json'),'utf8'));
  const policy = JSON.parse(readFileSync(join(root,'translations/coverage-policy.json'),'utf8'));
  for(const file of readdirSync(enDir).filter(file=>file.endsWith('.json')).sort()) englishResources[file.slice(0,-5)] = JSON.parse(readFileSync(join(enDir,file),'utf8'));
  const manifest = JSON.parse(readFileSync(join(root,`patches/${appVersion}/manifest.json`),'utf8'));
  const sourceManifest = manifest.resourceSources;
  if (!sourceManifest || Object.keys(sourceManifest).length !== 20 || !sourceManifest.desktop || JSON.stringify(Object.keys(englishResources).sort()) !== JSON.stringify(Object.keys(sourceManifest).sort())) throw new Error('Incomplete pinned English namespace set');
  for (const [ns, source] of Object.entries(englishResources)) {
    const pinned = sourceManifest[ns];
    if (leafEntries(source).length !== pinned.leaves || createHash('sha256').update(JSON.stringify(source)).digest('hex') !== pinned.sha256) throw new Error(`English source changed: ${ns}`);
  }
  const supplement = JSON.parse(readFileSync(join(root,'translations/patch-ui.en.json'),'utf8'));
  const supplementZh = JSON.parse(readFileSync(join(root,'translations/patch-ui.zh-CN.json'),'utf8'));
  if (!manifest.uiSupplement || !manifest.uiSupplement.leaves || leafEntries(supplement).length !== manifest.uiSupplement.leaves || createHash('sha256').update(JSON.stringify(supplement)).digest('hex') !== manifest.uiSupplement.sha256) throw new Error('Supplemental English source changed');
  if (Object.entries(supplement).some(([key,text])=>key!==text)) throw new Error('Supplemental display keys must equal their pinned English text');
  validateTree(supplement,supplementZh,'patchUi',terminology);
  englishResources.patchUi=supplement;resources.patchUi=supplementZh;
  for (const file of readdirSync(zhDir).filter(file => file.endsWith('.json')).sort()) {
    const namespace = file.slice(0, -5);
    if (!Object.hasOwn(sourceManifest,namespace)) throw new Error(`Unknown source namespace file: ${namespace}`);
    const english = englishResources[namespace];
    if(!english)throw new Error(`Unknown namespace: ${namespace}`);
    const chinese = JSON.parse(readFileSync(join(zhDir, file), 'utf8'));
    validateTree(english, chinese, namespace, terminology);
    const all = leafEntries(english);
    const translated = leafEntries(chinese);
    if (translated.length === 0) throw new Error(`Empty namespace: ${namespace}`);
    if (firstBatch.includes(namespace) && all.length !== translated.length) throw new Error(`Incomplete first-batch namespace ${namespace}: ${translated.length}/${all.length}`);
    resources[namespace] = chinese;
  }
  const coverage = measureCoverage(englishResources,resources,policy);
  const out = join(root, 'translations/build', appVersion); mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'coverage.json'), JSON.stringify(coverage,null,2)+'\n');
  const unreviewed = Object.entries(coverage.namespaces).flatMap(([ns,row])=>row.unreviewedEnglishKeys.map(key=>`${ns}.${key}`));
  if(unreviewed.length)throw new Error(`Unreviewed unchanged English (${unreviewed.length}): ${unreviewed.slice(0,12).join(', ')}`);
  if(coverage.summary.missingRequired)throw new Error(`Incomplete functional coverage: ${coverage.summary.missingRequired} required keys missing; see translations/build/${appVersion}/coverage.json`);
  for (const namespace of firstBatch) if (!resources[namespace]) throw new Error(`Missing first-batch namespace: ${namespace}`);
  if (!resources.components) throw new Error('Missing targeted components');
  const scope = JSON.parse(readFileSync(join(root, 'translations/components-scope.json'), 'utf8'));
  const target = new Set(scope.keys);
  const english = new Map(leafEntries(JSON.parse(readFileSync(join(enDir,'components.json'),'utf8'))));
  const translated = new Map(leafEntries(resources.components));
  if (target.size !== scope.keys.length || !target.size || scope.appVersion !== appVersion) throw new Error('Invalid components scope');
  for (const key of target) if (!english.has(key) || !translated.has(key)) throw new Error(`Missing target component key: ${key}`);
  coverage.namespaces.components.targeted = target.size;
  coverage.namespaces.components.targetedProvided = [...target].filter(key => translated.has(key)).length;
  if (!resources.desktop || coverage.namespaces.desktop.total !== sourceManifest.desktop.leaves) throw new Error('Missing desktop menu/dialog resources');
  const {desktop, ...renderer} = resources;
  const nativeKeys=manifest.desktopSupplementKeys;
  if(!Array.isArray(nativeKeys)||nativeKeys.length!==15||new Set(nativeKeys).size!==nativeKeys.length)throw new Error('Invalid pinned native role label set');
  const desktopSupplement={};
  for(const key of nativeKeys){
    if(Object.hasOwn(desktop,key)||typeof resources.patchUi[key]!=='string')throw new Error(`Invalid native role label: ${key}`);
    desktopSupplement[key]=resources.patchUi[key];
  }
  coverage.renderer = { namespaces:Object.keys(renderer).length, total:coverage.summary.total-coverage.namespaces.desktop.total, provided:coverage.summary.provided-coverage.namespaces.desktop.provided };
  coverage.desktop = { total:coverage.namespaces.desktop.total, provided:coverage.namespaces.desktop.provided };
  coverage.originalSources = { rendererNamespaces:19, rendererTotal:Object.entries(sourceManifest).filter(([ns])=>ns!=='desktop').reduce((sum,[,source])=>sum+source.leaves,0), desktopTotal:sourceManifest.desktop.leaves };
  coverage.supplement = { namespace:'patchUi',total:coverage.namespaces.patchUi.total,provided:coverage.namespaces.patchUi.provided };
  const output = `// Factory Desktop ${appVersion} — generated by tools/build_resource.mjs\nexport const resources = ${JSON.stringify(renderer)};\n`;
  const syntax = checkJavaScript(new Map([['resources-zh-CN.js', Buffer.from(output)]]));
  if (syntax.failures.length) throw new Error(`Generated ESM syntax failed: ${JSON.stringify(syntax.failures)}`);
  writeFileSync(join(out, 'resources-zh-CN.js'), output);
  writeFileSync(join(out, 'desktop-zh-CN.json'), JSON.stringify({...desktop,...desktopSupplement},null,2)+'\n');
  writeFileSync(join(out, 'coverage.json'), JSON.stringify(coverage,null,2)+'\n');
  console.log(JSON.stringify(coverage.summary,null,2));
  console.log('Build PASS: complete declared functional scope, reviewed English exceptions, terminology, interpolation/tag/URL/code validation, ESM syntax.');
  return resources;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { buildResource(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
