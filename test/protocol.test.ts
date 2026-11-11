import assert from "node:assert/strict";
import test from "node:test";
import {
  flagSections,
  HexError,
  readControl,
  readDone,
  readFlags,
  readHistory,
  readLabs,
  transcriptMarkdown,
} from "../src/hex/protocol.ts";

test("retained history preserves raw text and empty app and mode metadata", () => {
  const entry = {
    id: 42,
    timestamp_ms: 1793035445000,
    raw_text: "Bună\nLine two",
    final_text: "Bună!\nLine two.",
    application: null,
    mode: null,
    kind: "dictation",
    recording: "/tmp/unused.wav",
  };
  const result = readHistory(JSON.stringify({ version: 1, entries: [entry], retention: "off", truncated: true }));
  assert.equal(result.entries[0].raw_text, entry.raw_text);
  assert.equal(result.entries[0].final_text, entry.final_text);
  assert.equal(result.entries[0].application, null);
  assert.equal(result.retention, "off");
  assert.equal(result.truncated, true);
});

test("unknown response versions and malformed history fail without echoing transcript text", () => {
  assert.throws(
    () => readHistory('{"version":2,"entries":["private text"]}'),
    (error) => {
      return error instanceof HexError && error.code === "incompatible" && !error.message.includes("private text");
    },
  );
});

test("live control distinguishes accepted requests, refusals, and timeouts", () => {
  assert.equal(
    readDone(readControl('{"version":4,"status":"done","message":"Pasting the last dictation"}')),
    "Pasting the last dictation",
  );
  assert.throws(
    () => readControl('{"version":4,"status":"error","code":"not-running","message":"Hex is not running"}'),
    { code: "not-running" },
  );
  assert.throws(() => readControl('{"version":4,"status":"error","code":"control-timeout","message":"Timed out"}'), {
    code: "timeout",
  });
});

test("Labs match their exact settings key and keep managed flags read-only", () => {
  const flags = readFlags({
    status: "settings",
    settings: [
      { key: "meetings.enabled", kind: "bool", value: false, writable: true, about: "Labs: Meetings" },
      { key: "labs.live_text", kind: "bool", value: true, writable: true, about: "Labs: Live Text" },
      { key: "sound_effects", kind: "bool", value: true, writable: true, about: "Play recording tones" },
      { key: "unsupported", kind: "bool", value: false, available: false, writable: true, about: "Other platform" },
      { key: "indicator_position", kind: "choice" },
    ],
  });
  const labs = readLabs(
    "meetings   off      everyone  Record calls and keep transcripts (its own pane) (hex settings meetings.enabled)\n" +
      "live-text  managed  everyone  Show provisional words (hex settings labs.live_text)\n",
  );
  const result = flagSections(flags, labs);
  assert.deepEqual(
    result.labs.map((flag) => flag.key),
    ["meetings.enabled", "labs.live_text"],
  );
  assert.equal(result.labs[1].writable, false);
  assert.deepEqual(
    result.settings.map((flag) => flag.key),
    ["sound_effects"],
  );
  assert.throws(() => readLabs("Changed CLI output"), { code: "labs-format" });
  assert.deepEqual(
    flagSections(flags, []).settings.map((flag) => flag.key),
    ["sound_effects"],
  );
});

test("transcript details keep embedded Markdown and fence markers inside literal text", () => {
  const text = "Some text\n```\n![tracker](https://example.invalid/image)\n````";
  assert.equal(transcriptMarkdown(text), "`````\n" + text + "\n`````");
});
