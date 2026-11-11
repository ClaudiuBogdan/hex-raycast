# Hex for Raycast

A community Raycast extension for the [Hex dictation app](https://anoma.ly/hex/). Use it to find and reuse a transcript, toggle a setting, or dictate from a Raycast hotkey.

## Setup

Install [Hex](https://anoma.ly/hex/) on an Apple silicon Mac running macOS 15 or later. The extension targets the CLI shipped with Hex 3.4.0 and uses Raycast API 2.11. Complete Hex's first-run setup before recording. The extension finds the CLI inside the app, so you do not need to configure a shell path.

- **Search Dictation History** lists recent transcripts and searches all retained dictations by text. Enter pastes the selected transcript. The action menu offers copy, the raw variant when distinct, refresh, and Open History in Hex.
- **Search Hex Settings & Labs** finds flags by name, description, or CLI key. See the current state and turn writable flags on or off. The action menu links to Hex Settings, Output, and the selected Lab.
- **Toggle Dictation** starts or finishes a dictation using Hex's configured recording and delivery behavior.
- **Copy Latest from History** copies the latest saved entry. Use the command's Transcript Variant preference to choose final or raw text.
- **Paste Last Dictation** asks the running Hex app to paste its last dictation. This can still work when History is off and Hex has the result in memory.

Use Raycast Settings → Extensions → Hex to assign hotkeys. History reads work with Hex closed. Recording, Paste Last, and flag changes use the running Hex app.

## Transcript data

The extension reads retained text through the installed Hex CLI. It keeps search results in memory for the open view and does not maintain a transcript cache or send the text to a service. Explicit copy actions mark text as concealed in Raycast Clipboard History. Dictation continues to use the processing and delivery options you set in Hex.

## Develop

Use Node.js 22.22.2 or later and Raycast. From the project directory run:

```sh
npm ci
npm run dev
```

Run `npm test`, `npm run typecheck`, and `npm run build` before packaging a change. Run `npx eslint src` for source linting. For the full `npm run lint` check and [Raycast Store submission](https://developers.raycast.com/basics/publish-an-extension), replace the provisional GitHub handle in `package.json` with the publisher's Raycast username.
