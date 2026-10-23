'use strict';

// Loaded by the pinned Factory main-process patch, independent of the installer.
const defaultFs = require('node:fs/promises');
const { dirname, isAbsolute } = require('node:path');
const { randomUUID } = require('node:crypto');

function createRemarksStore({ filePath, fs = defaultFs }) {
  if (!isAbsolute(filePath)) throw new Error('Project remarks require an absolute file path');
  let initialized = false, projectRemarks = {}, revision = 0, queue = Promise.resolve();
  const snapshot = () => ({ revision, projectRemarks: { ...projectRemarks } });

  async function load() {
    if (initialized) return;
    let document;
    try { document = JSON.parse(await fs.readFile(filePath, 'utf8')); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      document = { version: 1, projectRemarks: {} };
    }
    if (!document || document.version !== 1 || !document.projectRemarks ||
        typeof document.projectRemarks !== 'object' || Array.isArray(document.projectRemarks)) {
      throw new Error('Invalid project remarks document');
    }
    for (const [key, value] of Object.entries(document.projectRemarks)) {
      if (!key || typeof value !== 'string' || !value || value.length > 80 ||
          value.replace(/[\r\n\t]+/g, ' ').trim() !== value) {
        throw new Error('Invalid stored project remark');
      }
    }
    projectRemarks = { ...document.projectRemarks };
    initialized = true;
  }

  async function persist(document) {
    await fs.mkdir(dirname(filePath), { recursive: true });
    const temporary = `${filePath}.${randomUUID()}.tmp`;
    let handle;
    try {
      handle = await fs.open(temporary, 'wx');
      await handle.writeFile(JSON.stringify(document, null, 2) + '\n');
      await handle.sync();
      await handle.close();
      handle = null;
      await fs.rename(temporary, filePath);
    } finally {
      if (handle) await handle.close().catch(() => {});
      await fs.unlink(temporary).catch(error => {
        if (error.code !== 'ENOENT') console.warn('[Factory-Expand] Temporary remarks cleanup failed', error);
      });
    }
  }

  function enqueue(action) {
    const operation = queue.then(action);
    queue = operation.catch(() => {});
    return operation;
  }

  return {
    get: () => enqueue(async () => { await load(); return snapshot(); }),
    set: input => enqueue(async () => {
      if (!input || typeof input.key !== 'string' || !input.key || typeof input.remark !== 'string') {
        throw new Error('Invalid project remark input');
      }
      const remark = input.remark.replace(/[\r\n\t]+/g, ' ').trim();
      if (remark.length > 80) throw new Error('Invalid project remark length');
      await load();
      const previous = Object.hasOwn(projectRemarks, input.key) ? projectRemarks[input.key] : '';
      if (previous === remark) return snapshot();
      const next = { ...projectRemarks };
      if (remark) Object.defineProperty(next, input.key, {
        value: remark, enumerable: true, writable: true, configurable: true
      });
      else delete next[input.key];
      await persist({ version: 1, projectRemarks: next });
      projectRemarks = next;
      revision += 1;
      return snapshot();
    })
  };
}

const registrations = new WeakMap();
function registerProjectRemarks({ ipcMain, BrowserWindow, filePath }) {
  if (registrations.has(ipcMain)) return registrations.get(ipcMain);
  const store = createRemarksStore({ filePath });
  let broadcastRevision = 0;
  ipcMain.handle('factory-expand:projectRemarks:get', () => store.get());
  ipcMain.handle('factory-expand:projectRemarks:set', async (_event, input) => {
    const next = await store.set(input);
    if (next.revision > broadcastRevision) {
      broadcastRevision = next.revision;
      for (const window of BrowserWindow.getAllWindows()) {
        try {
          if (!window.isDestroyed() && !window.webContents.isDestroyed()) {
            window.webContents.send('factory-expand:projectRemarks:changed', next);
          }
        } catch (error) { console.warn('[Factory-Expand] Remarks broadcast failed', error); }
      }
    }
    return next;
  });
  const service = { store };
  registrations.set(ipcMain, service);
  return service;
}

module.exports = { createRemarksStore, registerProjectRemarks };
