import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkJavaScript } from '../scripts/lib/syntaxcheck.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const firstBatch = ['common','settings','sessions','softwareFactory','inbox','onboarding','errors'];

export function leafEntries(tree, prefix = '') {
  if (tree !== null && typeof tree === 'object') return Object.entries(tree).flatMap(([key, child]) => leafEntries(child, prefix ? `${prefix}.${key}` : key));
  return [[prefix, tree]];
}

function tagStructure(text) {
  const roots = [];
  const stack = [{ children: roots }];
  for (const match of text.matchAll(/<(\/?)([A-Za-z][\w:-]*|\d+)(\s[^<>]*?)?(\/?)>/g)) {
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
  if (tagStructure(english) !== tagStructure(chinese)) throw new Error(`Rich-text structure mismatch: ${label}`);
  sameTokens(/https?:\/\/[^\s<>()"'`，。；！]+/g, 'URL');
  sameTokens(/(`+)[\s\S]*?\1/g, 'Code fragment');
}

export function validateTree(english, chinese, label = '') {
  if (english === null || chinese === null || typeof english !== typeof chinese || Array.isArray(english) !== Array.isArray(chinese)) throw new Error(`Type mismatch: ${label}`);
  if (typeof english === 'string') return validateText(english, chinese, label);
  if (typeof english !== 'object') {
    if (english !== chinese) throw new Error(`Non-string value changed: ${label}`);
    return;
  }
  if (Array.isArray(english) && english.length !== chinese.length) throw new Error(`Array length mismatch: ${label}`);
  for (const [key, child] of Object.entries(chinese)) {
    if (!Object.hasOwn(english, key)) throw new Error(`Unknown key: ${label}.${key}`);
    validateTree(english[key], child, `${label}.${key}`);
  }
}

export function buildResource() {
  const enDir = join(root, 'translations/en');
  const zhDir = join(root, 'translations/zh-CN');
  const resources = {};
  const coverage = {};
  for (const file of readdirSync(zhDir).filter(file => file.endsWith('.json')).sort()) {
    const namespace = file.slice(0, -5);
    const english = JSON.parse(readFileSync(join(enDir, file), 'utf8'));
    const chinese = JSON.parse(readFileSync(join(zhDir, file), 'utf8'));
    validateTree(english, chinese, namespace);
    const all = leafEntries(english);
    const allMap = new Map(all);
    const translated = leafEntries(chinese);
    if (translated.length === 0) throw new Error(`Empty namespace: ${namespace}`);
    if (firstBatch.includes(namespace) && all.length !== translated.length) throw new Error(`Incomplete first-batch namespace ${namespace}: ${translated.length}/${all.length}`);
    coverage[namespace] = { translated: translated.length, total: all.length, unchanged: translated.filter(([path,text]) => allMap.get(path) === text).length };
    resources[namespace] = chinese;
  }
  for (const namespace of firstBatch) if (!resources[namespace]) throw new Error(`Missing first-batch namespace: ${namespace}`);
  if (!resources.components) throw new Error('Missing targeted components');
  const scope = JSON.parse(readFileSync(join(root, 'translations/components-scope.json'), 'utf8'));
  const target = new Set(scope.keys);
  const english = new Map(leafEntries(JSON.parse(readFileSync(join(enDir,'components.json'),'utf8'))));
  const translated = new Map(leafEntries(resources.components));
  if (target.size !== scope.keys.length || !target.size || scope.appVersion !== '0.200.0') throw new Error('Invalid components scope');
  for (const key of target) if (!english.has(key) || !translated.has(key)) throw new Error(`Missing target component key: ${key}`);
  coverage.components.targeted = target.size;
  coverage.components.targetedTranslated = [...target].filter(key => translated.has(key)).length;
  const output = `// Factory Desktop 0.200.0 — generated by tools/build_resource.mjs\nexport const resources = ${JSON.stringify(resources)};\n`;
  const syntax = checkJavaScript(new Map([['resources-zh-CN.js', Buffer.from(output)]]));
  if (syntax.failures.length) throw new Error(`Generated ESM syntax failed: ${JSON.stringify(syntax.failures)}`);
  const out = join(root, 'translations/build'); mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'resources-zh-CN.js'), output);
  writeFileSync(join(out, 'coverage.json'), JSON.stringify(coverage,null,2)+'\n');
  console.log(JSON.stringify(coverage,null,2));
  console.log('Build PASS: complete first batch, targeted components, interpolation/tag/URL/code validation, ESM syntax.');
  return resources;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { buildResource(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
