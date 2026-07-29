const backButton = document.querySelector("#back-button");
const forwardButton = document.querySelector("#forward-button");
const backShortcut = document.querySelector("#back-shortcut");
const forwardShortcut = document.querySelector("#forward-shortcut");
const historyStatus = document.querySelector("#history-status");
const shortcutSettings = document.querySelector("#shortcut-settings");

function renderStatus(status) {
  if (status?.error) {
    historyStatus.textContent = "Tab Jumper is unavailable.";
    backButton.disabled = true;
    forwardButton.disabled = true;
    return;
  }

  backButton.disabled = !status.canGoBack;
  forwardButton.disabled = !status.canGoForward;

  historyStatus.textContent =
    status.count === 0
      ? "Your trail starts with the next tab switch."
      : `Position ${status.position} of ${status.count}`;
}

async function send(type) {
  backButton.disabled = true;
  forwardButton.disabled = true;

  try {
    const status = await chrome.runtime.sendMessage({ type });
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
}

backButton.addEventListener("click", () => {
  void send("go-back");
});

forwardButton.addEventListener("click", () => {
  void send("go-forward");
});

shortcutSettings.addEventListener("click", () => {
  void chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
});

void send("get-status");
void loadShortcuts().catch(() => {
  backShortcut.textContent = "Not assigned";
  forwardShortcut.textContent = "Not assigned";
});
