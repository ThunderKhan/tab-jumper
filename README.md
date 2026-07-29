<p align="center">
  <img src="icons/icon-128.png" width="96" alt="Tab Jumper logo">
</p>

<h1 align="center">Tab Jumper</h1>

<p align="center">
  Navigate your tab history or instantly toggle between your two latest tabs.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?logo=googlechrome&logoColor=white" alt="Chrome Manifest V3">
  <img src="https://img.shields.io/badge/version-1.1.0-6958E7" alt="Version 1.1.0">
  <img src="https://img.shields.io/badge/dependencies-none-2EA44F" alt="No dependencies">
</p>

## Why Tab Jumper?

Chrome's existing tab shortcuts solve a different problem:

- `Ctrl + Tab` moves through tabs in their tab-strip order.
- `Ctrl + 1–8` works only when you already know a tab's position.

Tab Jumper remembers the order in which you **visited** tabs. You can retrace
your complete tab history or use one shortcut to alternate between your two
most recently active tabs.

## Features

- Navigate backward and forward through visited tabs.
- Toggle between the two latest tabs using one shortcut.
- Choose a navigation mode from the extension popup.
- Preserve the selected mode after restarting the browser.
- Continue a trail across multiple Chrome windows.
- Automatically remove closed tabs from the trail.
- Discard stale forward history after manually choosing a new tab.
- Use keyboard shortcuts or accessible popup controls.
- Keep up to 100 recent tab visits per browser session.
- Run without external dependencies, analytics, or network requests.
- Access no page contents, URLs, titles, or conventional browser history.

## Navigation modes

### History

Suppose you visit these tabs:

```text
Documentation → GitHub → Stack Overflow
```

Your trail behaves like this:

| Action | Active tab |
| --- | --- |
| Back | GitHub |
| Back again | Documentation |
| Forward | GitHub |
| Manually select Gmail | Gmail, with the old forward path discarded |

This is visit-order navigation—not tab-strip-order navigation.

### Last two tabs

Suppose you move from tab A to tab B:

```text
A → B
```

Each press of the **Switch tab** shortcut now alternates between them:

```text
B → A → B → A
```

If you manually visit tab C, the active pair becomes B and C. This mode behaves
like an `Alt + Tab` switcher for browser tabs.

## Installation

Tab Jumper is currently installed as an unpacked extension:

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode** in the upper-right corner.
4. Select **Load unpacked**.
5. Choose the project folder containing `manifest.json`.
6. Visit a few tabs and try the shortcuts.

## Keyboard shortcuts

| Action | Windows and Linux | macOS |
| --- | --- | --- |
| Previous visited tab | `Ctrl + Shift + Left` | `Command + Shift + Left` |
| Next visited tab | `Ctrl + Shift + Right` | `Command + Shift + Right` |
| Toggle the last two tabs | `Ctrl + Shift + Space` | `Command + Shift + Space` |

Chrome may leave a suggested shortcut unassigned when it conflicts with another
extension or browser command. Open `chrome://extensions/shortcuts`, or select
**Change shortcuts** in the Tab Jumper popup, to assign different keys.

Only the shortcuts belonging to the selected navigation mode perform an action.

## Privacy

Tab Jumper requests only Chrome's `storage` permission.

It stores numeric tab and window identifiers in `chrome.storage.session` and
stores the selected navigation mode in `chrome.storage.local`. Session storage
is temporary, so the actual tab trail resets after Chrome is fully closed. The
saved preference contains only `history` or `recent`.

The extension does **not**:

- Read or modify webpage contents.
- Store tab URLs, titles, favicons, or search terms.
- Request access to browsing history.
- Send information to a server.
- Use analytics or tracking scripts.

## Project structure

```text
tab-jumper/
├── manifest.json
├── background.js
├── history-model.js
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── icons/
├── test/
│   └── history-model.test.js
└── package.json
```

- `background.js` connects Chrome tab events and keyboard commands to the
  history engine.
- `history-model.js` contains the pure, testable state transitions.
- `popup/` contains the extension interface.
- `test/` verifies navigation, two-tab toggling, branching, tab cleanup,
  replacement, and the history-size limit.

## Development

Tab Jumper uses vanilla JavaScript and requires no build step or runtime
dependencies.

Run the test suite:

```bash
npm test
```

Check JavaScript syntax:

```bash
npm run check
```

After changing the extension, return to `chrome://extensions` and select the
extension's **Reload** button.

## Contributing

Bug reports, feature suggestions, and pull requests are welcome. For code
changes:

1. Create a focused branch.
2. Add or update tests for behavior changes.
3. Run `npm test` and `npm run check`.
4. Open a pull request explaining the problem and solution.

## Current limitation

Tab Jumper keeps its history only for the current Chrome session. This is
intentional for privacy and simplicity; reopening Chrome starts a fresh trail.
