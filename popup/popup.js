const backButton = document.querySelector("#back-button");
const forwardButton = document.querySelector("#forward-button");
const backShortcut = document.querySelector("#back-shortcut");
const forwardShortcut = document.querySelector("#forward-shortcut");
const recentShortcut = document.querySelector("#recent-shortcut");
const historyStatus = document.querySelector("#history-status");
const shortcutSettings = document.querySelector("#shortcut-settings");
const historyControls = document.querySelector("#history-controls");
const recentControls = document.querySelector("#recent-controls");
const recentButton = document.querySelector("#recent-button");
const modeDescription = document.querySelector("#mode-description");
const modeInputs = [...document.querySelectorAll('input[name="mode"]')];

function setButtonsDisabled(disabled) {
  backButton.disabled = disabled;
  forwardButton.disabled = disabled;
  recentButton.disabled = disabled;
}

function renderStatus(status) {
  if (status?.error) {
    historyStatus.textContent = "Tab Jumper is unavailable.";
    setButtonsDisabled(true);
    return;
  }

  const isRecentMode = status.mode === "recent";
  historyControls.hidden = isRecentMode;
  recentControls.hidden = !isRecentMode;
  modeDescription.textContent = isRecentMode
    ? "Use one shortcut to alternate between your two latest tabs."
    : "Move backward and forward through your complete tab trail.";

  for (const input of modeInputs) {
    input.checked = input.value === status.mode;
  }

  backButton.disabled = !status.canGoBack;
  forwardButton.disabled = !status.canGoForward;
  recentButton.disabled = !status.canToggleRecent;

  if (isRecentMode) {
    historyStatus.textContent = status.canToggleRecent
      ? "Your last two tabs are ready."
      : "Visit one more tab to enable switching.";
  } else {
    historyStatus.textContent =
      status.count === 0
        ? "Your trail starts with the next tab switch."
        : `Position ${status.position} of ${status.count}`;
  }
}

async function send(type, details = {}) {
  setButtonsDisabled(true);

  try {
    const status = await chrome.runtime.sendMessage({ type, ...details });
    renderStatus(status);
  } catch {
    renderStatus({ error: true });
  }
}

async function loadShortcuts() {
  const commands = await chrome.commands.getAll();
  const shortcuts = Object.fromEntries(
    commands.map((command) => [command.name, command.shortcut]),
  );

  backShortcut.textContent = shortcuts["go-back-tab"] || "Not assigned";
  forwardShortcut.textContent = shortcuts["go-forward-tab"] || "Not assigned";
  recentShortcut.textContent =
    shortcuts["toggle-recent-tabs"] || "Not assigned";
}

backButton.addEventListener("click", () => {
  void send("go-back");
});

forwardButton.addEventListener("click", () => {
  void send("go-forward");
});

recentButton.addEventListener("click", () => {
  void send("toggle-recent");
});

for (const input of modeInputs) {
  input.addEventListener("change", () => {
    if (input.checked) {
      void send("set-mode", { mode: input.value });
    }
  });
}

shortcutSettings.addEventListener("click", () => {
  void chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
});

void send("get-status");
void loadShortcuts().catch(() => {
  backShortcut.textContent = "Not assigned";
  forwardShortcut.textContent = "Not assigned";
  recentShortcut.textContent = "Not assigned";
});
