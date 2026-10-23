import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createRemarksStore, registerProjectRemarks } =
  require('../scripts/runtime/factory-project-remarks.cjs');

test('备注按键合并、清除并在新 store 恢复', async t => {
  const dir = await fs.mkdtemp(join(tmpdir(), 'factory-remarks-'));
  t.after(async () => {
    assert.equal(resolve(dirname(dir)), resolve(tmpdir()));
    await fs.rm(dir, { recursive: true, force: true });
  });
  const filePath = join(dir, '.factory', 'factory-expand.json');
  const store = createRemarksStore({ filePath });
  assert.deepEqual(await store.get(), { revision: 0, projectRemarks: {} });
  await Promise.all([
    store.set({ key: 'C:/a/app', remark: '  生产\n环境  ' }),
    store.set({ key: 'machine:remote:/a/app', remark: '远端' })
  ]);
  const saved = await store.get();
  assert.equal(saved.revision, 2);
  assert.deepEqual(saved.projectRemarks,
    { 'C:/a/app': '生产 环境', 'machine:remote:/a/app': '远端' });
  const bytes = await fs.readFile(filePath, 'utf8');
  await store.set({ key: 'C:/a/app', remark: '生产 环境' });
  assert.equal((await store.get()).revision, 2);
  assert.equal(await fs.readFile(filePath, 'utf8'), bytes);
  await store.set({ key: 'C:/a/app', remark: ' \t ' });
  const reopened = createRemarksStore({ filePath });
  assert.deepEqual((await reopened.get()).projectRemarks,
    { 'machine:remote:/a/app': '远端' });
  await assert.rejects(reopened.set({ key: 'x', remark: '中'.repeat(81) }));
  await assert.rejects(reopened.set({ key: '', remark: 'x' }));
  await assert.rejects(reopened.set({ key: 'x', remark: 1 }));
});

test('损坏读取可重试，rename 失败不改旧数据且队列可恢复', async t => {
  const dir = await fs.mkdtemp(join(tmpdir(), 'factory-remarks-'));
  t.after(async () => {
    assert.equal(resolve(dirname(dir)), resolve(tmpdir()));
    await fs.rm(dir, { recursive: true, force: true });
  });
  const filePath = join(dir, 'factory-expand.json');
  await fs.writeFile(filePath, '{broken');
  const broken = createRemarksStore({ filePath });
  await assert.rejects(broken.get());
  await assert.rejects(broken.set({ key: 'x', remark: '新值' }));
  assert.equal(await fs.readFile(filePath, 'utf8'), '{broken');
  await fs.writeFile(filePath, JSON.stringify({ version: 1, projectRemarks: { x: '旧值' } }));
  assert.equal((await broken.get()).projectRemarks.x, '旧值');
  let failRename = true;
  const store = createRemarksStore({ filePath, fs: {
    ...fs, rename: async (...args) => {
      if (failRename) throw Object.assign(new Error('simulated rename failure'), { code: 'EACCES' });
      return fs.rename(...args);
    }
  } });
  const before = await fs.readFile(filePath, 'utf8');
  await assert.rejects(store.set({ key: 'x', remark: '新值' }));
  assert.equal(await fs.readFile(filePath, 'utf8'), before);
  assert.equal((await store.get()).projectRemarks.x, '旧值');
  assert.deepEqual(await fs.readdir(dir), ['factory-expand.json']);
  failRename = false;
  await store.set({ key: 'y', remark: '可恢复' });
  assert.deepEqual((await store.get()).projectRemarks, { x: '旧值', y: '可恢复' });
});

test('非法持久化结构保留原文件，80 字符与特殊键可保存', async t => {
  const dir = await fs.mkdtemp(join(tmpdir(), 'factory-remarks-'));
  t.after(async () => {
    assert.equal(resolve(dirname(dir)), resolve(tmpdir()));
    await fs.rm(dir, { recursive: true, force: true });
  });
  const filePath = join(dir, 'factory-expand.json');
  for (const document of [
    { version: 2, projectRemarks: {} },
    { version: 1, projectRemarks: [] },
    ...[1, '', '中'.repeat(81), ' x '].map(value => ({ version: 1, projectRemarks: { x: value } }))
  ]) {
    const bytes = JSON.stringify(document);
    await fs.writeFile(filePath, bytes);
    const store = createRemarksStore({ filePath });
    await assert.rejects(store.get());
    await assert.rejects(store.set({ key: 'new', remark: '不能覆盖' }));
    assert.equal(await fs.readFile(filePath, 'utf8'), bytes);
  }
  await fs.unlink(filePath);
  const store = createRemarksStore({ filePath });
  await store.set({ key: '__proto__', remark: '中'.repeat(80) });
  const next = await store.get();
  assert.equal(Object.hasOwn(next.projectRemarks, '__proto__'), true);
  assert.equal(Object.getPrototypeOf(next.projectRemarks), Object.prototype);
  next.projectRemarks['__proto__'] = '不能改内部状态';
  assert.equal((await store.get()).projectRemarks['__proto__'].length, 80);
  await store.set({ key: '__proto__', remark: '' });
  assert.deepEqual((await store.get()).projectRemarks, {});
});

test('IPC 只注册一次，成功广播到多个窗口，发送失败不影响保存', async t => {
  const dir = await fs.mkdtemp(join(tmpdir(), 'factory-remarks-'));
  t.after(async () => {
    assert.equal(resolve(dirname(dir)), resolve(tmpdir()));
    await fs.rm(dir, { recursive: true, force: true });
  });
  const handlers = new Map(), messages = [[], []];
  let handles = 0, fail = false;
  const ipcMain = { handle: (channel, handler) => {
    handles += 1; assert.equal(handlers.has(channel), false); handlers.set(channel, handler);
  } };
  const windows = messages.map((log, index) => ({
    isDestroyed: () => false,
    webContents: { isDestroyed: () => false, send: (channel, payload) => {
      if (index === 0 && fail) throw new Error('simulated closed window');
      log.push({ channel, payload });
    } }
  }));
  windows.push({ isDestroyed: () => true });
  const options = { ipcMain, BrowserWindow: { getAllWindows: () => windows },
    filePath: join(dir, 'factory-expand.json') };
  const service = registerProjectRemarks(options);
  assert.equal(registerProjectRemarks(options), service);
  assert.equal(handles, 2);
  const set = handlers.get('factory-expand:projectRemarks:set');
  await set(null, { key: 'a', remark: '第一条' });
  assert.equal(messages[0][0].payload.revision, 1);
  assert.deepEqual(messages[0], messages[1]);
  await assert.rejects(set(null, { key: '', remark: '不能写入' }));
  assert.equal(messages[0].length, 1);
  fail = true;
  const originalWarn = console.warn;
  let warnings = 0;
  console.warn = () => { warnings += 1; };
  try { await set(null, { key: 'b', remark: '第二条' }); }
  finally { console.warn = originalWarn; }
  assert.equal(warnings, 1);
  assert.equal(messages[1][1].payload.revision, 2);
  assert.equal((await handlers.get('factory-expand:projectRemarks:get')()).projectRemarks.b, '第二条');
});

const { createRemarksClient } = await import('../scripts/runtime/factory-project-remarks.js');
test('广播先到时旧 get/set 应答不回退，退订后重连重新读取', async () => {
  const events = [], reads = [];
  let changed, resolveSave;
  const api = {
    onChanged: listener => {
      events.push('subscribe'); changed = listener;
      return () => { events.push('unsubscribe'); changed = null; };
    },
    get: () => { events.push('get'); return new Promise(r => reads.push(r)); },
    set: () => new Promise(r => { resolveSave = r; })
  };
  const client = createRemarksClient(api);
  const stop = client.subscribe(() => {});
  assert.deepEqual(events.slice(0, 2), ['subscribe', 'get']);
  changed({ revision: 1, projectRemarks: { x: '广播' } });
  reads[0]({ revision: 0, projectRemarks: {} });
  await new Promise(setImmediate);
  assert.equal(client.getSnapshot().projectRemarks.x, '广播');
  const stable = client.getSnapshot();
  assert.equal(client.getSnapshot(), stable);
  const saving = client.save({ key: 'x', remark: '保存' });
  changed({ revision: 3, projectRemarks: { x: '更新的广播' } });
  resolveSave({ revision: 2, projectRemarks: { x: '保存' } });
  await saving;
  assert.equal(client.getSnapshot().revision, 3);
  stop(); stop();
  assert.equal(events.filter(e => e === 'unsubscribe').length, 1);
  const stopAgain = client.subscribe(() => {});
  assert.equal(reads.length, 2);
  reads[1]({ revision: 3, projectRemarks: { x: '更新的广播' } });
  await new Promise(setImmediate);
  stopAgain();
});

test('加载失败可重试，重连后忽略旧连接结果', async () => {
  const pending = [];
  let live = 0;
  const client = createRemarksClient({
    onChanged: () => { live += 1; return () => { live -= 1; }; },
    get: () => new Promise((resolve, reject) => pending.push({ resolve, reject })),
    set: async () => { throw new Error('write failed'); }
  });
  const stop = client.subscribe(() => {});
  pending[0].reject(new Error('read failed'));
  await new Promise(setImmediate);
  assert.equal(client.getSnapshot().status, 'error');
  const retry = client.load();
  pending[1].resolve({ revision: 0, projectRemarks: {} });
  await retry;
  assert.equal(client.getSnapshot().status, 'ready');
  const oldRead = client.load();
  stop();
  assert.equal(live, 0);
  const stopAgain = client.subscribe(() => {});
  pending[3].resolve({ revision: 2, projectRemarks: { x: '新连接' } });
  await new Promise(setImmediate);
  pending[2].resolve({ revision: 9, projectRemarks: { x: '旧连接不能覆盖' } });
  await oldRead;
  assert.equal(client.getSnapshot().projectRemarks.x, '新连接');
  await assert.rejects(client.save({ key: 'x', remark: '失败' }));
  assert.equal(client.getSnapshot().projectRemarks.x, '新连接');
  stopAgain();
  assert.equal(live, 0);
});

test('迟到读取错误不能覆盖较新广播', async () => {
  let rejectRead, changed;
  const client = createRemarksClient({
    onChanged: listener => { changed = listener; return () => {}; },
    get: () => new Promise((_resolve, reject) => { rejectRead = reject; }),
    set: async () => ({ revision: 2, projectRemarks: {} })
  });
  const stop = client.subscribe(() => {});
  changed({ revision: 1, projectRemarks: { x: '新值' } });
  rejectRead(new Error('stale read failure'));
  await new Promise(setImmediate);
  assert.equal(client.getSnapshot().status, 'ready');
  assert.equal(client.getSnapshot().projectRemarks.x, '新值');
  stop();
});

const { renderProjectRemarkGroup } = await import('../scripts/runtime/factory-project-remarks.js');
test('真实包装组件保留原 props，取消不写、IME 不保存，失败保留草稿', async () => {
  const slots = [], cleanup = [], writes = [];
  let cursor = 0, changed, resolveWrite, rejectWrite, resolveInitial;
  const api = {
    onChanged: listener => { changed = listener; return () => { changed = null; }; },
    get: () => new Promise(resolve => { resolveInitial = resolve; }),
    set: input => { writes.push(input); return new Promise((resolve, reject) => {
      resolveWrite = resolve; rejectWrite = reject;
    }); }
  };
  const React = {
    Fragment: 'Fragment',
    useState: initial => {
      const slot = cursor++;
      if (!(slot in slots)) slots[slot] = initial;
      return [slots[slot], value => { slots[slot] = value; }];
    },
    useRef: initial => {
      const slot = cursor++;
      return slots[slot] ??= { current: initial };
    },
    useEffect: (effect, deps) => {
      const slot = cursor++;
      if (!(slot in slots)) {
        slots[slot] = { deps, cleanup: effect() };
        cleanup.push(() => slots[slot].cleanup?.());
      } else if (deps.some((value, index) => value !== slots[slot].deps[index])) {
        slots[slot].cleanup?.(); slots[slot] = { deps, cleanup: effect() };
      }
    },
    useSyncExternalStore: (subscribe, getSnapshot) => {
      const slot = cursor++;
      if (!(slot in slots)) { slots[slot] = true; cleanup.push(subscribe(() => {})); }
      return getSnapshot();
    }
  };
  const originalAction = { key: 'original' }, onToggle = () => {};
  const original = { factoryProjectKey: 'C:/app', label: 'app', tooltip: 'C:/app',
    contextMenuItems: [originalAction], onToggleCollapsed: onToggle };
  const ui = { React, api, jsx: (type, props) => ({ type, props }), Group: 'Group', Modal: 'Modal',
    Stack: 'Stack', Text: 'Text', Input: 'Input', ErrorText: 'ErrorText', Button: 'Button',
    buttonVariants: { Primary: 'primary', Secondary: 'secondary' }, modalSize: 'sm', space: 8,
    textProps: { tone: 'tertiary', variant: 'caption' },
    useModalTheme: () => ({ modal: {} }), useLocale: () => {}, text: key => key };
  const render = () => { cursor = 0; return renderProjectRemarkGroup(original, ui).props.children; };
  let [group] = render();
  group.props.contextMenuItems[1].onSelect();
  assert.equal(render()[1].props.children.props.children[1].props.disabled, true);
  resolveInitial({ revision: 0, projectRemarks: { 'C:/app': '已有备注' } });
  await new Promise(setImmediate);
  render();
  assert.equal(render()[1].props.children.props.children[1].props.value, '已有备注');
  render()[1].props.footer.props.children[0].props.onClick();
  [group] = render();
  assert.equal(group.props.onToggleCollapsed, onToggle);
  assert.equal(group.props.contextMenuItems[0], originalAction);
  assert.equal(original.contextMenuItems.length, 1);
  assert.equal(Object.hasOwn(group.props, 'factoryProjectKey'), false);
  group.props.contextMenuItems[1].onSelect();
  let [, dialog] = render();
  let input = dialog.props.children.props.children[1];
  let focused = false, prevented = false;
  input.props.ref.current = { disabled: false, focus: () => { focused = true; } };
  dialog.props.onOpenAutoFocus({ preventDefault: () => { prevented = true; } });
  assert.equal(focused && prevented, true);
  assert.equal(dialog.props.children.props.children[0].props.variant, 'caption');
  assert.equal(input.props.maxLength, 80);
  input.props.onChange({ target: { value: '生产' } });
  [, dialog] = render();
  input = dialog.props.children.props.children[1];
  input.props.onKeyDown({ key: 'Enter', nativeEvent: { isComposing: true },
    preventDefault: () => assert.fail('IME Enter must not submit') });
  assert.equal(writes.length, 0);
  dialog.props.footer.props.children[0].props.onClick();
  assert.equal(render()[1], null);
  group.props.contextMenuItems[1].onSelect();
  [, dialog] = render();
  dialog.props.children.props.children[1].props.onChange({ target: { value: '待保存' } });
  [, dialog] = render();
  const save = dialog.props.footer.props.children[1].props.onClick();
  await dialog.props.footer.props.children[1].props.onClick();
  dialog.props.onOpenChange(false);
  assert.equal(writes.length, 1);
  assert.ok(render()[1]);
  changed({ revision: 1, projectRemarks: { 'C:/app': '另一个窗口' } });
  [group, dialog] = render();
  assert.equal(group.props.label, '另一个窗口');
  assert.equal(group.props.tooltip, 'app\nC:/app');
  assert.equal(dialog.props.children.props.children[1].props.value, '待保存');
  rejectWrite(new Error('simulated failed write'));
  await save;
  [, dialog] = render();
  assert.equal(dialog.props.children.props.children[1].props.value, '待保存');
  assert.equal(dialog.props.children.props.children.at(-1).props.children, 'Could not save project remark.');
  const retry = dialog.props.footer.props.children[1].props.onClick();
  resolveWrite({ revision: 2, projectRemarks: { 'C:/app': '待保存' } });
  await retry;
  assert.equal(render()[1], null);
  for (const stop of cleanup) stop?.();
  assert.equal(changed, null);
});
