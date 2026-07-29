export const MAX_HISTORY_ENTRIES = 100;

function isTabEntry(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    Number.isInteger(value.tabId) &&
    Number.isInteger(value.windowId)
  );
}

export function normalizeState(value) {
  const entries = Array.isArray(value?.entries)
    ? value.entries.filter(isTabEntry).map((entry) => ({ ...entry }))
    : [];

  const requestedCursor = Number.isInteger(value?.cursor)
    ? value.cursor
    : entries.length - 1;

  return {
    entries,
    cursor:
      entries.length === 0
        ? -1
        : Math.min(Math.max(requestedCursor, 0), entries.length - 1),
  };
}

export function visitTab(value, tab) {
  const state = normalizeState(value);
  const currentEntry = state.entries[state.cursor];

  if (currentEntry?.tabId === tab.tabId) {
    return state;
  }

  const entries = state.entries.slice(0, state.cursor + 1);
  entries.push({ tabId: tab.tabId, windowId: tab.windowId });

  const overflow = Math.max(0, entries.length - MAX_HISTORY_ENTRIES);
  if (overflow > 0) {
    entries.splice(0, overflow);
  }

  return {
    entries,
    cursor: entries.length - 1,
  };
}

export function removeTab(value, tabId) {
  const state = normalizeState(value);
  const entries = [];
  let cursor = -1;

  state.entries.forEach((entry, index) => {
    if (entry.tabId === tabId) {
      return;
    }

    entries.push(entry);
    if (index <= state.cursor) {
      cursor = entries.length - 1;
    }
  });

  return { entries, cursor };
}

export function replaceTab(value, removedTabId, addedTabId, windowId) {
  const state = normalizeState(value);

  return {
    ...state,
    entries: state.entries.map((entry) =>
      entry.tabId === removedTabId
        ? {
            ...entry,
            tabId: addedTabId,
            windowId: Number.isInteger(windowId) ? windowId : entry.windowId,
          }
        : entry,
    ),
  };
}

export function pruneToOpenTabs(value, openTabIds) {
  const state = normalizeState(value);
  const entries = [];
  let cursor = -1;

  state.entries.forEach((entry, index) => {
    if (!openTabIds.has(entry.tabId)) {
      return;
    }

    entries.push(entry);
    if (index <= state.cursor) {
      cursor = entries.length - 1;
    }
  });

  return { entries, cursor };
}

export function moveCursor(value, direction) {
  const state = normalizeState(value);
  const nextCursor = state.cursor + direction;

  if (nextCursor < 0 || nextCursor >= state.entries.length) {
    return { state, target: null };
  }

  return {
    state: { ...state, cursor: nextCursor },
    target: state.entries[nextCursor],
  };
}

export function getStatus(value) {
  const state = normalizeState(value);

  return {
    canGoBack: state.cursor > 0,
    canGoForward:
      state.cursor >= 0 && state.cursor < state.entries.length - 1,
    count: state.entries.length,
    position: state.cursor < 0 ? 0 : state.cursor + 1,
  };
}
