// React and UI primitives come from Factory's renderer, never a second runtime.
export function createRemarksClient(api) {
  let state = { status: 'idle', revision: -1, projectRemarks: {}, error: null };
  let connection = 0, disconnect;
  const listeners = new Set();
  const notify = () => listeners.forEach(listener => listener());

  function accept(next, generation) {
    if (generation !== connection || !listeners.size) return;
    if (!next || !Number.isInteger(next.revision) || next.revision < 0 ||
        !next.projectRemarks || typeof next.projectRemarks !== 'object' ||
        Array.isArray(next.projectRemarks) ||
        Object.values(next.projectRemarks).some(value => typeof value !== 'string')) {
      throw new Error('Invalid project remarks snapshot');
    }
    if (next.revision < state.revision || (next.revision === state.revision && state.status === 'ready')) return;
    state = { status: 'ready', revision: next.revision, projectRemarks: { ...next.projectRemarks }, error: null };
    notify();
  }

  async function load() {
    const generation = connection, startRevision = state.revision;
    state = { ...state, status: 'loading', error: null };
    notify();
    try { accept(await api.get(), generation); }
    catch (error) {
      if (generation !== connection || !listeners.size || state.revision > startRevision || state.status === 'ready') return;
      state = { ...state, status: 'error', error };
      notify();
    }
  }

  return {
    getSnapshot: () => state,
    subscribe: listener => {
      const subscription = () => listener();
      listeners.add(subscription);
      if (listeners.size === 1) {
        const generation = ++connection;
        disconnect = api.onChanged(next => {
          try { accept(next, generation); }
          catch (error) { console.warn('[Factory-Expand] Invalid remarks broadcast', error); }
        });
        void load();
      }
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        listeners.delete(subscription);
        if (!listeners.size) {
          connection += 1;
          disconnect?.();
          disconnect = undefined;
        }
      };
    },
    load,
    save: async input => {
      const generation = connection;
      accept(await api.set(input), generation);
    }
  };
}

const clients = new WeakMap();
export function renderProjectRemarkGroup(props, ui) {
  const { factoryProjectKey, ...originalProps } = props;
  let client = clients.get(ui.api);
  if (!client) { client = createRemarksClient(ui.api); clients.set(ui.api, client); }
  const { useState, useRef, useEffect, useSyncExternalStore, Fragment } = ui.React;
  const snapshot = useSyncExternalStore(client.subscribe, client.getSnapshot, client.getSnapshot);
  ui.useLocale();
  const theme = ui.useModalTheme();
  const [open, setOpen] = useState(false), [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false), [error, setError] = useState(null);
  const mounted = useRef(true), savingRef = useRef(false), pendingPrefill = useRef(false), inputRef = useRef(null);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const current = Object.hasOwn(snapshot.projectRemarks, factoryProjectKey)
    ? snapshot.projectRemarks[factoryProjectKey] : '';
  const tooltip = current
    ? [...new Set([originalProps.label, originalProps.tooltip].filter(Boolean))].join('\n')
    : originalProps.tooltip;
  const loaded = snapshot.status === 'ready';
  useEffect(() => {
    if (open && loaded && pendingPrefill.current) {
      pendingPrefill.current = false;
      setDraft(current);
      inputRef.current?.focus();
    }
  }, [open, loaded, current]);

  function openEditor() {
    pendingPrefill.current = !loaded;
    setDraft(current); setError(null); setOpen(true);
  }
  function closeEditor() { if (!savingRef.current) setOpen(false); }
  async function saveEditor() {
    if (savingRef.current || !loaded) return;
    const remark = draft.replace(/[\r\n\t]+/g, ' ').trim();
    if (remark.length > 80) { setError('Project remark cannot exceed 80 characters.'); return; }
    savingRef.current = true;
    setSaving(true); setError(null);
    try {
      await client.save({ key: factoryProjectKey, remark });
      if (mounted.current) setOpen(false);
    } catch {
      if (mounted.current) setError('Could not save project remark.');
    } finally {
      savingRef.current = false;
      if (mounted.current) setSaving(false);
    }
  }
  const menu = [...(originalProps.contextMenuItems ?? []), {
    key: 'factory-expand-edit-remark', icon: 'edit-3',
    label: ui.text('Edit project remark'), onSelect: openEditor
  }];
  const group = ui.jsx(ui.Group, { ...originalProps,
    label: current || originalProps.label, tooltip, contextMenuItems: menu });
  const dialog = open ? ui.jsx(ui.Modal, { ...theme.modal, open: true,
    size: ui.modalSize, title: ui.text('Edit project remark'),
    onOpenAutoFocus: event => {
      if (inputRef.current && !inputRef.current.disabled) {
        event.preventDefault(); inputRef.current.focus();
      }
    },
    onOpenChange: value => { if (!value) closeEditor(); },
    footer: ui.jsx(ui.Stack, { gap: ui.space, justify: 'flex-end', children: [
      ui.jsx(ui.Button, { disabled: saving, onClick: closeEditor,
        variant: ui.buttonVariants.Secondary, children: ui.text('Cancel') }),
      ui.jsx(ui.Button, { disabled: saving || !loaded, onClick: saveEditor,
        variant: ui.buttonVariants.Primary, children: ui.text(saving ? 'Saving…' : 'Save') })
    ] }),
    children: ui.jsx(ui.Stack, { direction: 'column', gap: ui.space, children: [
      ui.jsx(ui.Text, { ...ui.textProps, style: { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' },
        children: [originalProps.label, originalProps.tooltip].filter(Boolean).join('\n') }),
      ui.jsx(ui.Input, { ref: inputRef, autoFocus: true, maxLength: 80, value: draft, disabled: saving || !loaded,
        'aria-label': ui.text('Project remark'), onChange: event => setDraft(event.target.value),
        onKeyDown: event => {
          if (event.key === 'Enter' && !event.isComposing && !event.nativeEvent?.isComposing && event.keyCode !== 229) {
            event.preventDefault(); void saveEditor();
          }
        } }),
      ui.jsx(ui.Text, { ...ui.textProps, children: ui.text('Leave empty to clear the remark.') }),
      snapshot.status === 'error' ? ui.jsx(ui.ErrorText, { children: ui.text('Could not load project remarks.') }) : null,
      snapshot.status === 'error' ? ui.jsx(ui.Button, {
        onClick: () => { void client.load(); }, children: ui.text('Retry') }) : null,
      error ? ui.jsx(ui.ErrorText, { children: ui.text(error) }) : null
    ] })
  }) : null;
  return ui.jsx(Fragment, { children: [group, dialog] });
}
