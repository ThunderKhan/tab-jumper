import {
  getStatus,
  moveCursor,
  normalizeState,
  pruneToOpenTabs,
  removeTab,
  replaceTab,
  toggleRecentTab,
  visitTab,
} from "./history-model.js";

const STORAGE_KEY = "tabJumperHistory";
const SETTINGS_KEY = "tabJumperSettings";
const HISTORY_MODE = "history";
const RECENT_MODE = "recent";
let stateQueue = Promise.resolve();

function readState() {
  return chrome.storage.session
    .get(STORAGE_KEY)
    .then((stored) => normalizeState(stored[STORAGE_KEY]));
}

function writeState(state) {
  return chrome.storage.session.set({ [STORAGE_KEY]: state });
}

async function readMode() {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  return stored[SETTINGS_KEY]?.mode === RECENT_MODE
    ? RECENT_MODE
    : HISTORY_MODE;
}

function writeMode(mode) {
  const safeMode = mode === RECENT_MODE ? RECENT_MODE : HISTORY_MODE;
  return chrome.storage.local.set({ [SETTINGS_KEY]: { mode: safeMode } });
}

function updateState(task) {
  const operation = stateQueue.then(async () => {
    const state = await readState();
    const result = await task(state);
    await writeState(result.state);
    return result;
  });

  stateQueue = operation.catch((error) => {
    console.error("Tab Jumper state update failed:", error);
  });

  return operation;
}

async function getOpenTabIds() {
  const tabs = await chrome.tabs.query({});
  return new Set(tabs.map((tab) => tab.id).filter(Number.isInteger));
}

function recordActivation(tabId, windowId) {
  return updateState(async (state) => ({
    state: visitTab(state, { tabId, windowId }),
  }));
}

async function getFreshStatus() {
  const mode = await readMode();
  const result = await updateState(async (state) => {
    const openTabIds = await getOpenTabIds();
    const nextState = pruneToOpenTabs(state, openTabIds);
    return { state: nextState, status: getStatus(nextState) };
  });

  return { ...result.status, mode };
}

async function navigate(direction) {
  const result = await updateState(async (initialState) => {
    const openTabIds = await getOpenTabIds();
    let state = pruneToOpenTabs(initialState, openTabIds);

    while (true) {
      const movement = moveCursor(state, direction);

      if (!movement.target) {
        return { state, status: getStatus(state), moved: false };
      }

      try {
        await chrome.tabs.update(movement.target.tabId, { active: true });
        await chrome.windows.update(movement.target.windowId, { focused: true });

        return {
          state: movement.state,
          status: getStatus(movement.state),
          moved: true,
        };
      } catch {
        // The target can disappear between querying and activating it.
        state = removeTab(state, movement.target.tabId);
      }
    }
  });

  return {
    ...result.status,
    mode: HISTORY_MODE,
    moved: result.moved,
  };
}

async function toggleRecent() {
  const result = await updateState(async (initialState) => {
    const openTabIds = await getOpenTabIds();
    let state = pruneToOpenTabs(initialState, openTabIds);

    while (true) {
      const movement = toggleRecentTab(state);

      if (!movement.target) {
        return { state, status: getStatus(state), moved: false };
      }

      try {
        await chrome.tabs.update(movement.target.tabId, { active: true });
        await chrome.windows.update(movement.target.windowId, { focused: true });

        return {
          state: movement.state,
          status: getStatus(movement.state),
          moved: true,
        };
      } catch {
        state = removeTab(state, movement.target.tabId);
      }
    }
  });

  return {
    ...result.status,
    mode: RECENT_MODE,
    moved: result.moved,
  };
}

async function navigateInHistoryMode(direction) {
  const mode = await readMode();
  return mode === HISTORY_MODE ? navigate(direction) : getFreshStatus();
}

async function toggleInRecentMode() {
  const mode = await readMode();
  return mode === RECENT_MODE ? toggleRecent() : getFreshStatus();
}

async function setMode(mode) {
  const safeMode = mode === RECENT_MODE ? RECENT_MODE : HISTORY_MODE;
  await writeMode(safeMode);
  return getFreshStatus();
}

async function seedCurrentTab() {
  const [activeTab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });

  if (Number.isInteger(activeTab?.id) && Number.isInteger(activeTab?.windowId)) {
    await recordActivation(activeTab.id, activeTab.windowId);
  }
}

chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  void recordActivation(tabId, windowId);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void updateState(async (state) => ({ state: removeTab(state, tabId) }));
});

chrome.tabs.onReplaced.addListener((addedTabId, removedTabId) => {
  void chrome.tabs
    .get(addedTabId)
    .then((tab) =>
      updateState(async (state) => ({
        state: replaceTab(state, removedTabId, addedTabId, tab.windowId),
      })),
    )
    .catch(() => {
      // The replacement was itself closed before Chrome returned its details.
    });
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "go-back-tab") {
    void navigateInHistoryMode(-1);
  } else if (command === "go-forward-tab") {
    void navigateInHistoryMode(1);
  } else if (command === "toggle-recent-tabs") {
    void toggleInRecentMode();
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  let request;

  if (message?.type === "get-status") {
    request = getFreshStatus();
  } else if (message?.type === "go-back") {
    request = navigateInHistoryMode(-1);
  } else if (message?.type === "go-forward") {
    request = navigateInHistoryMode(1);
  } else if (message?.type === "toggle-recent") {
    request = toggleInRecentMode();
  } else if (message?.type === "set-mode") {
    request = setMode(message.mode);
  } else {
    return false;
  }

  request
    .then(sendResponse)
    .catch((error) => sendResponse({ error: error.message }));

  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  void seedCurrentTab();
});

chrome.runtime.onStartup.addListener(() => {
  void seedCurrentTab();
});

void seedCurrentTab();
