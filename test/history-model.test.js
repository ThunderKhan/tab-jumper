import test from "node:test";
import assert from "node:assert/strict";

import {
  MAX_HISTORY_ENTRIES,
  getStatus,
  moveCursor,
  pruneToOpenTabs,
  removeTab,
  replaceTab,
  visitTab,
} from "../history-model.js";

const tab = (tabId, windowId = 1) => ({ tabId, windowId });

test("visits, goes backward, and goes forward", () => {
  let state = { entries: [], cursor: -1 };
  state = visitTab(state, tab(1));
  state = visitTab(state, tab(2));
  state = visitTab(state, tab(3));

  let movement = moveCursor(state, -1);
  assert.equal(movement.target.tabId, 2);
  assert.deepEqual(getStatus(movement.state), {
    canGoBack: true,
    canGoForward: true,
    count: 3,
    position: 2,
  });

  movement = moveCursor(movement.state, 1);
  assert.equal(movement.target.tabId, 3);
  assert.equal(movement.state.cursor, 2);
});

test("a manual visit after going back discards the forward trail", () => {
  let state = { entries: [], cursor: -1 };
  state = visitTab(state, tab(1));
  state = visitTab(state, tab(2));
  state = visitTab(state, tab(3));
  state = moveCursor(state, -1).state;
  state = visitTab(state, tab(4));

  assert.deepEqual(
    state.entries.map((entry) => entry.tabId),
    [1, 2, 4],
  );
  assert.equal(getStatus(state).canGoForward, false);
});

test("repeated activation of the current tab is ignored", () => {
  const state = visitTab(visitTab({ entries: [], cursor: -1 }, tab(1)), tab(1));
  assert.deepEqual(state.entries, [tab(1)]);
});

test("closed tabs are removed while preserving the current position", () => {
  let state = {
    entries: [tab(1), tab(2), tab(3), tab(4)],
    cursor: 3,
  };

  state = removeTab(state, 2);
  assert.deepEqual(
    state.entries.map((entry) => entry.tabId),
    [1, 3, 4],
  );
  assert.equal(state.cursor, 2);

  state = pruneToOpenTabs(state, new Set([1, 3]));
  assert.equal(state.cursor, 1);
  assert.equal(state.entries[state.cursor].tabId, 3);
});

test("Chrome tab replacements retain history position", () => {
  const state = replaceTab(
    { entries: [tab(1), tab(2)], cursor: 1 },
    2,
    20,
  );

  assert.equal(state.entries[1].tabId, 20);
  assert.equal(state.cursor, 1);
});

test("history is capped to a small session-friendly size", () => {
  let state = { entries: [], cursor: -1 };

  for (let tabId = 1; tabId <= MAX_HISTORY_ENTRIES + 5; tabId += 1) {
    state = visitTab(state, tab(tabId));
  }

  assert.equal(state.entries.length, MAX_HISTORY_ENTRIES);
  assert.equal(state.entries[0].tabId, 6);
  assert.equal(state.cursor, MAX_HISTORY_ENTRIES - 1);
});
