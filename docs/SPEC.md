# Hex for Raycast specification

Hex for Raycast brings retained dictation history, on/off settings, and recording shortcuts to Raycast. It targets the Apple silicon Hex app on macOS 15 or later and uses the CLI contract documented in Hex 3.4.0. Hex owns microphone access, recording, transcription, processing, delivery, and retention. [Hex 3.4.0](https://github.com/anomalyco/hex/releases/tag/v3.4.0)

## v1 commands

Each command appears under the **Hex** subtitle and uses the macOS Hex app icon. Command IDs stay stable so Raycast can identify existing hotkeys and preferences. [Extension manifest](../package.json)

- **Search History** (`search-dictation-history`) opens with the 50 newest retained entries. A text query searches final and raw text across retained history through `hex history --json --raw --limit 50 --search=<query>`. Raycast waits briefly for typing to settle and drops superseded requests. When Hex reports truncation, **Show More** raises the limit in batches of 50 up to 200. Rows show a preview and time. Details include available app and mode metadata, the result kind, and literal transcript text. Enter pastes the selected transcript. The action menu also offers copy, distinct raw variants, refresh, and **Open History in Hex**.
- **Settings & Labs** (`search-settings`) groups on/off flags in two searchable sections. Find a flag by name, description, or CLI key, then choose **Turn on** or **Turn off**. The view shows the state and description, and offers **Open Hex Settings**, **Open Hex Output**, and **Show in Hex Labs** on Lab rows.
- **Toggle Recording** (`toggle-dictation`) closes Raycast and calls `hex dictation toggle --json`. Run it once to begin recording and again to finish. Hex shows its own indicator and handles the transcript using the person's settings.
- **Copy Last Transcript** (`copy-latest-history`) reads `hex history --json --raw --limit 1`. The **Transcript Variant** preference defaults to final text and can select raw text. If the latest entry has no text for that variant, the command reports it and leaves the clipboard alone.
- **Paste Last Dictation** (`paste-last-dictation`) closes Raycast and calls `hex paste-last --json`. A successful reply confirms that Hex queued the paste. Hex can refuse while recording and can still have a last result with History off. For a specific saved entry or raw text, use **Search History**.

Copy reads the newest retained entry and can include printed results. Paste uses the running app's last dictation. The two commands can return different text. [Hex control CLI](https://github.com/anomalyco/hex/blob/v3.4.0/docs/cli.md) · [Hex transcript CLI](https://github.com/anomalyco/hex/blob/v3.4.0/docs/transcript-cli.md)

## Settings and Labs

- Read the registry through `hex settings list --json` and the Labs catalog through `hex labs list`. Join on the exact settings key so Labs such as Meetings can appear under Labs even when the key lives outside `labs.*`.
- Use the Lab catalog's current state and the settings registry's write permissions. Show managed and read-only flags without a write action. If the Labs listing format changes, report that error and keep ordinary settings available.
- Apply one change through `hex settings set <key> <true|false> --json`. Reload the view from Hex after the reply and surface refusals. Opening, searching, and refreshing the view are read-only.
- Settings & Labs links to the app's panes. **Open Hex Output** uses `hex window show modes --json` to show context-selected processing modes. A manual mode picker would require a Hex-side contract. Separate start and stop commands, speech-model switching, and fixed-choice settings are follow-up ideas.

[Settings registry](https://github.com/anomalyco/hex/blob/v3.4.0/src/control/settings.rs) · [Labs CLI](https://github.com/anomalyco/hex/blob/v3.4.0/src/labs/cli.rs) · [Hex mode selection](https://github.com/anomalyco/hex/blob/v3.4.0/src/dictation/config.rs)

## Integration and privacy

- Find Hex by macOS bundle ID `anomaly.hex` and invoke the app's absolute `Contents/MacOS/hex` path with argument arrays. Use separate parsers for History JSON v1 and control JSON v4, with process time and output bounds.
- History reads work with Hex closed. Running-app commands offer **Launch Hex** when it is stopped. After a timeout, the person can check the current state before trying again.
- Keep search results in memory for the open view. Treat transcripts as literal text in previews. Use Raycast's concealed clipboard option for explicit copy actions. The extension makes no transcript network requests, keeps no transcript cache on disk, and reads History through Hex's CLI.
- Use concise command titles in root search. The app icon is a PNG export of Hex's original macOS icon, with attribution in [LICENSE](../LICENSE).

[Hex transcript CLI](https://github.com/anomalyco/hex/blob/v3.4.0/docs/transcript-cli.md) · [Raycast clipboard](https://developers.raycast.com/api-reference/clipboard)

## Verification and release

- The distribution build, TypeScript check, source lint, and protocol tests passed. A synthetic library checked through the installed Hex development CLI confirmed a raw-text search hit beyond the first 50 entries, the Labs catalog format, and the stopped-app reply. The development extension was installed and its five commands were verified in the installed manifest.
- Before Store submission, test a supported signed Hex release in Raycast. Verify recording and paste focus from root search and a hotkey, copy and paste for both transcript variants, and an on/off change for a Lab and an ordinary setting. Check an empty or disabled History, a managed flag, and behavior with Hex stopped.
- The GitHub repository hosts the source. The Raycast Store review needs a valid Raycast publisher username in the manifest, full Store lint, and a pull request to the public extensions repository.

[Store preparation](https://developers.raycast.com/basics/prepare-an-extension-for-store) · [Publishing workflow](https://developers.raycast.com/basics/publish-an-extension)

## Reference extension

The Superwhisper Store listing exposes six commands. The source below is the revision linked by the listing. The observations describe the published interface and source behavior. Native interaction was not tested. [Store listing](https://www.raycast.com/nchudleigh/superwhisper) · [Published source](https://github.com/raycast/extensions/tree/a7235c46e699b0a74b1fd2c43860ad563bf7d192/extensions/superwhisper) · [Manifest](https://github.com/raycast/extensions/blob/a7235c46e699b0a74b1fd2c43860ad563bf7d192/extensions/superwhisper/package.json)

1. **Start Recording** is a no-view command. It checks for the desktop app and opens `superwhisper://record`. The listing describes the same command as starting and stopping recordings. [Recording command](https://github.com/raycast/extensions/blob/a7235c46e699b0a74b1fd2c43860ad563bf7d192/extensions/superwhisper/src/toggle-record.ts)
2. **Search History** shows a timestamped list with processed and raw text in the detail pane. Actions paste or copy the selected result, use its raw text when offered, copy the latest result, or reveal the recording in Finder. It loads metadata in batches of 50, newest modified first, and skips missing or unreadable metadata. The command uses Raycast list filtering with the rows it loads. [History view](https://github.com/raycast/extensions/blob/a7235c46e699b0a74b1fd2c43860ad563bf7d192/extensions/superwhisper/src/search-history.tsx) · [History loader](https://github.com/raycast/extensions/blob/a7235c46e699b0a74b1fd2c43860ad563bf7d192/extensions/superwhisper/src/hooks.ts)
3. **Copy Last History** copies the chosen variant from the newest valid recording. AI Processed is the default. If that recording lacks the requested variant, the standalone command reports an error. The latest-copy action inside Search History uses processed text when available and otherwise uses raw text. [Copy command](https://github.com/raycast/extensions/blob/a7235c46e699b0a74b1fd2c43860ad563bf7d192/extensions/superwhisper/src/copy-last-history.ts) · [Variant selection](https://github.com/raycast/extensions/blob/a7235c46e699b0a74b1fd2c43860ad563bf7d192/extensions/superwhisper/src/hooks.ts)
4. **Paste Last History** uses the same variant selection. It closes Raycast, pastes into the active app, and copies to the clipboard with an explanation if paste throws. [Paste command](https://github.com/raycast/extensions/blob/a7235c46e699b0a74b1fd2c43860ad563bf7d192/extensions/superwhisper/src/paste-last-history.ts)
5. **Select Mode** loads mode definitions from a configurable directory. It shows each mode's name and available metadata, such as language and models, then sends the chosen key through `superwhisper://mode?key=…`. [Mode picker](https://github.com/raycast/extensions/blob/a7235c46e699b0a74b1fd2c43860ad563bf7d192/extensions/superwhisper/src/select-mode.tsx) · [Mode loader](https://github.com/raycast/extensions/blob/a7235c46e699b0a74b1fd2c43860ad563bf7d192/extensions/superwhisper/src/hooks.ts)
6. **Open Settings** checks for the app and opens `superwhisper://settings`. The installation helper recognizes both the regular and Setapp bundle IDs and offers the vendor's download page when the app is missing. [Settings command](https://github.com/raycast/extensions/blob/a7235c46e699b0a74b1fd2c43860ad563bf7d192/extensions/superwhisper/src/open-settings.ts) · [Installation helper](https://github.com/raycast/extensions/blob/a7235c46e699b0a74b1fd2c43860ad563bf7d192/extensions/superwhisper/src/utils.ts)

The three history commands share a recording-directory preference. The mode picker has its own mode-directory preference. [Manifest](https://github.com/raycast/extensions/blob/a7235c46e699b0a74b1fd2c43860ad563bf7d192/extensions/superwhisper/package.json)
