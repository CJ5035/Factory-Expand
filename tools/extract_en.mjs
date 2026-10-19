// Deliberately limited to the data declarations of Factory Desktop 0.200.0.
// Never evaluates application code, function calls, getters or template expressions.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openAsar, closeAsar, readEntry, listEntries, findEntry, integrityOf, sha256 } from '../scripts/lib/asar.mjs';

export function parseDataDeclarations(source) {
  let pos = 0;
  let token;
  const definitions = new Map();
  const reference = Symbol('reference');
  const fail = (message) => { throw new Error(`${message} at ${pos}`); };
  function next() {
    while (pos < source.length) {
      if (/\s/.test(source[pos])) { pos++; continue; }
      if (source.startsWith('//', pos)) { pos = source.indexOf('\n', pos); if (pos < 0) pos = source.length; continue; }
      if (source.startsWith('/*', pos)) { const end = source.indexOf('*/', pos + 2); if (end < 0) fail('Unclosed comment'); pos = end + 2; continue; }
      break;
    }
    if (pos === source.length) return token = { type: 'eof' };
    const c = source[pos++];
    if ('"\'`'.includes(c)) {
      let value = '';
      while (pos < source.length) {
        let ch = source[pos++];
        if (ch === c) return token = { type: 'string', value };
        if (c === '`' && ch === '$' && source[pos] === '{') fail('Template expressions unsupported');
        if (ch !== '\\') { if (c !== '`' && /[\r\n]/.test(ch)) fail('Newline in string'); value += ch; continue; }
        ch = source[pos++];
        const escapes = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', '0': '\0' };
        if (ch === '\n') continue;
        if (ch === '\r') { if (source[pos] === '\n') pos++; continue; }
        if (ch === 'x' || ch === 'u') {
          const braced = ch === 'u' && source[pos] === '{';
          if (braced) pos++;
          const end = braced ? source.indexOf('}', pos) : pos + (ch === 'x' ? 2 : 4);
          const digits = source.slice(pos, end);
          if (end < 0 || !/^[\da-f]+$/i.test(digits) || (!braced && digits.length !== (ch === 'x' ? 2 : 4))) fail('Invalid hex escape');
          value += String.fromCodePoint(parseInt(digits, 16)); pos = end + (braced ? 1 : 0); continue;
        }
        if (ch === undefined || /[1-9]/.test(ch) || (ch === '0' && /\d/.test(source[pos] ?? ''))) fail('Unsupported escape');
        value += escapes[ch] ?? ch;
      }
      fail('Unclosed string');
    }
    if (/[A-Za-z_$]/.test(c)) {
      const start = pos - 1;
      while (pos < source.length && /[\w$]/.test(source[pos])) pos++;
      return token = { type: 'id', value: source.slice(start, pos) };
    }
    if (/\d/.test(c)) {
      const match = source.slice(pos - 1).match(/^\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/)[0];
      pos += match.length - 1;
      return token = { type: 'number', value: Number(match) };
    }
    return token = { type: c };
  }
  function take(type) { if (token.type !== type) fail(`Expected ${type}, got ${token.type}`); const value = token.value; next(); return value; }
  function value() {
    if (token.type === 'string' || token.type === 'number') { const result = token.value; next(); return result; }
    if (token.type === '-' || token.type === '!') {
      const op = token.type; next(); const number = take('number');
      if (op === '!' && number !== 0 && number !== 1) fail('Unsupported boolean literal');
      return op === '-' ? -number : !number;
    }
    if (token.type === 'id') {
      const name = take('id');
      if (name === 'null') return null;
      if (name === 'true' || name === 'false') return name === 'true';
      return { [reference]: name };
    }
    if (token.type === '{') {
      next(); const result = Object.create(null);
      while (token.type !== '}') {
        if (!['id', 'string', 'number'].includes(token.type)) fail('Unsupported object key');
        const key = String(token.value); next(); take(':');
        if (Object.hasOwn(result, key)) fail(`Duplicate key ${key}`);
        result[key] = value();
        if (token.type !== ',') break;
        next();
      }
      take('}'); return result;
    }
    if (token.type === '[') {
      next(); const result = [];
      while (token.type !== ']') { result.push(value()); if (token.type !== ',') break; next(); }
      take(']'); return result;
    }
    fail(`Unsupported expression ${token.type}`);
  }
  next();
  if (token.type === 'id' && token.value === 'const') next();
  do {
    const name = take('id'); take('=');
    if (definitions.has(name)) fail(`Duplicate declaration ${name}`);
    definitions.set(name, value());
    if (token.type !== ',') break;
    next();
  } while (true);
  if (token.type === ';') next();
  take('eof');
  const resolved = new Map();
  function resolveName(name, visiting = new Set()) {
    if (resolved.has(name)) return resolved.get(name);
    if (!definitions.has(name)) fail(`Unresolved reference ${name}`);
    if (visiting.has(name)) fail(`Cyclic reference ${name}`);
    const active = new Set(visiting).add(name);
    function expand(item) {
      if (item && typeof item === 'object') {
        if (item[reference]) return resolveName(item[reference], active);
        if (Array.isArray(item)) return item.map(expand);
        return Object.fromEntries(Object.entries(item).map(([key, child]) => [key, expand(child)]));
      }
      return item;
    }
    const result = expand(definitions.get(name)); resolved.set(name, result); return result;
  }
  // Resolve every declaration, so even unused bad references cannot be hidden.
  for (const name of definitions.keys()) resolveName(name);
  return resolved;
}

export function extractEnglish(source) {
  const startMarker = 'const beu={info:"Info",tip:"Tip"';
  const endMarker = ';function CSu(t)';
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end < 0 || source.indexOf(startMarker, start + 1) >= 0) throw new Error('Unsupported resource declaration layout');
  const data = parseDataDeclarations(source.slice(start, end + 1));
  const root = source.match(/D8t=CSu\(\{\.\.\.Object\.assign\(\{([^}]+)\}\),components:SSu\}\)/g);
  if (root?.length !== 1) throw new Error('Expected one D8t resource root');
  const entries = [...root[0].matchAll(/"\.\/([\w]+)\.json":([\w$]+)/g)];
  if (entries.length !== 18) throw new Error('Expected 18 JSON namespaces');
  const resources = {};
  for (const [, ns, name] of entries) {
    if (!data.has(name) || Object.hasOwn(resources, ns)) throw new Error(`Invalid namespace ${ns}/${name}`);
    resources[ns] = data.get(name);
  }
  resources.components = data.get('SSu');
  if (!resources.common || !resources.components || Object.keys(resources).length !== 19) throw new Error('Incomplete resources');
  return resources;
}

export function extractDesktopEnglish(source) {
  const startMarker = 'Sb={checkForUpdates:"Check for Updates..."';
  const endMarker = ',Db={checkForUpdates:"Buscar actualizaciones..."';
  const start = source.indexOf(startMarker), end = source.indexOf(endMarker, start);
  if (start < 0 || end < 0 || source.indexOf(startMarker, start + 1) >= 0 || source.indexOf(endMarker, end + 1) >= 0) throw new Error('Unsupported desktop resource declaration layout');
  const desktop = parseDataDeclarations(source.slice(start, end) + ';').get('$b');
  const count = tree => tree && typeof tree === 'object' ? Object.values(tree).reduce((sum, child) => sum + count(child), 0) : 1;
  if (!desktop?.menu || !desktop?.fileDialogs || count(desktop) !== 85) throw new Error('Incomplete desktop resources');
  return desktop;
}

export function validateArchive(file) {
  const asar = openAsar(file);
  try {
    for (const item of listEntries(asar)) {
      const meta = findEntry(asar.header, item.path);
      let bytes = item.unpacked ? readFileSync(join(`${file}.unpacked`, item.path.slice(1))) : readEntry(asar, item.path);
      if (item.unpacked) {
        // Factory signs keytar after packing. Verify the pinned signed bytes, then
        // compare its original unsigned PE to the archive metadata (not vice versa).
        if (item.path !== '/node_modules/keytar/build/Release/keytar.node' || sha256(bytes) !== 'e6ac229a5ffe2959e10f3d8f8b210bcc6abecf511060db2fa0362d79f4e25e1b') throw new Error(`Unknown unpacked file: ${item.path}`);
        const optional = bytes.readUInt32LE(0x3c) + 24;
        const cert = optional + 112 + 32;
        if (bytes.readUInt16LE(optional) !== 0x20b || bytes.readUInt32LE(cert) !== item.size || bytes.readUInt32LE(cert + 4) + item.size !== bytes.length) throw new Error('Unsupported signed keytar layout');
        bytes = Buffer.from(bytes.subarray(0, item.size));
        bytes.writeUInt32LE(0, optional + 64);
        bytes.fill(0, cert, cert + 8);
      }
      const actual = integrityOf(bytes);
      const expected = meta.integrity;
      if (bytes.length !== item.size || !expected || expected.algorithm !== 'SHA256' || expected.hash !== actual.hash || expected.blockSize !== actual.blockSize || JSON.stringify(expected.blocks) !== JSON.stringify(actual.blocks)) throw new Error(`Entry integrity mismatch: ${item.path}`);
    }
    return JSON.parse(readEntry(asar, 'package.json')).version;
  } finally { closeAsar(asar); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const file = process.argv.slice(2).find(arg => arg.startsWith('--asar='))?.slice(7);
    if (!file) throw new Error('Usage: node tools/extract_en.mjs --asar=<original app.asar>');
    if (sha256(readFileSync(file)) !== '07ac482d497a280c1af6d8f153a8fc1ea4bb9a08c3377a5ce65f6888423c7ace') throw new Error('Unsupported asar build');
    if (validateArchive(file) !== '0.200.0') throw new Error('Unsupported version');
    const asar = openAsar(file);
    let resources;
    try {
      resources = extractEnglish(readEntry(asar, '.vite/renderer/main_window/assets/index-CCcgJ39D.js').toString('utf8'));
      resources.desktop = extractDesktopEnglish(readEntry(asar, '.vite/build/initLifecycle-C1amcziW.js').toString('utf8'));
    }
    finally { closeAsar(asar); }
    const out = resolve(dirname(fileURLToPath(import.meta.url)), '../translations/en'); mkdirSync(out, { recursive: true });
    for (const [ns, tree] of Object.entries(resources)) {
      writeFileSync(join(out, `${ns}.json`), JSON.stringify(tree, null, 2) + '\n');
      const count = (node) => node && typeof node === 'object' ? Object.values(node).reduce((sum, item) => sum + count(item), 0) : 1;
      console.log(`${ns}: ${count(tree)} leaves`);
    }
    console.log('19 renderer namespaces and 1 desktop namespace extracted; all archive entry hashes verified.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
