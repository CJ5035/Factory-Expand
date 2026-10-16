import { sha256 } from './asar.mjs';

export function inspectFuse(bytes, layout) {
  const sentinel = Buffer.from('dL7pKGdnNz796PbbjQWNKmHXBZaB9tsX');
  const start = bytes.indexOf(sentinel);
  if (start < 0 || bytes.indexOf(sentinel, start + 1) !== -1 || start !== layout.offset || bytes[start + 32] !== 1 || bytes[start + 33] !== 9 || layout.index !== 4) throw new Error('Unknown Electron fuse layout');
  const at = start + 34 + 4;
  if (![0x30, 0x31].includes(bytes[at])) throw new Error('Unknown integrity fuse value');
  return { at, enabled: bytes[at] === 0x31 };
}

export function patchFuse(original, manifest) {
  if (sha256(original) !== manifest.original.exe) throw new Error('Fuse input must be pristine exe');
  const { at, enabled } = inspectFuse(original, manifest.fuse);
  if (!enabled) throw new Error('Original integrity fuse is not enabled');
  const patched = Buffer.from(original);
  patched[at] = 0x30;
  // Round-trip proves that the staged executable differs by exactly this byte.
  const restored = Buffer.from(patched); restored[at] = 0x31;
  if (!original.equals(restored)) throw new Error('Unexpected executable mutation');
  return patched;
}
